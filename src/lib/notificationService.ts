import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  audience: "all" | "members" | "open";
  minTier?: "Pink" | "Silver" | "Gold" | "Platinum";
  /** Contains the current user's id when they have read it. */
  readBy: string[];
  /** Contains the current user's id (and ADMIN_CLEAR_KEY) when they have hidden it. */
  deletedBy?: string[];
  link?: string;
  userId?: string;
};

export const ADMIN_CLEAR_KEY = "__admin__";

/** Live notifications the current visitor may see, merged with their own read/hidden state. */
export function subscribeToNotifications(callback: (notifs: Notification[]) => void) {
  let alive = true;
  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, audience, target_tier, user_id, link, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return console.error("Failed to load notifications:", error);
    const states = new Map<string, { read_at: string | null; hidden_at: string | null }>();
    if (uid) {
      const { data: st } = await supabase
        .from("notification_states")
        .select("notification_id, read_at, hidden_at")
        .eq("user_id", uid);
      for (const s of st ?? []) states.set(s.notification_id, s);
    }
    if (!alive) return;
    callback(
      (data ?? []).map((n) => {
        const s = states.get(n.id);
        return {
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.created_at,
          audience: (n.audience as Notification["audience"]) ?? "all",
          minTier: (n.target_tier as Notification["minTier"]) ?? undefined,
          userId: n.user_id ?? undefined,
          link: n.link ?? undefined,
          readBy: uid && s?.read_at ? [uid] : [],
          deletedBy: uid && s?.hidden_at ? [uid, ADMIN_CLEAR_KEY] : [],
        };
      }),
    );
  };
  void load();
  const channel = supabase
    .channel(`notifs-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load())
    .on("postgres_changes", { event: "*", schema: "public", table: "notification_states" }, () => void load())
    .subscribe();
  const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
  return () => {
    alive = false;
    sub.subscription.unsubscribe();
    supabase.removeChannel(channel);
  };
}

/** Admin only. Also triggers a web-push send (best effort). */
export async function createNotification(
  data: Omit<Notification, "id" | "createdAt" | "readBy" | "deletedBy">,
) {
  const { data: row, error } = await supabase
    .from("notifications")
    .insert({
      title: data.title,
      body: data.body,
      audience: data.audience,
      target_tier: data.minTier ?? null,
      user_id: data.userId ?? null,
      link: data.link ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  supabase.functions
    .invoke("send-push", { body: { notification_id: row.id } })
    .catch((e) => console.warn("Push send failed:", e));
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function markNotificationRead(notifId: string, userId: string, currentReadBy: string[]) {
  if (currentReadBy.includes(userId)) return;
  const { error } = await supabase
    .from("notification_states")
    .upsert({ notification_id: notifId, user_id: userId, read_at: new Date().toISOString() });
  if (error) throw error;
}

export async function hideNotificationForUser(id: string, uid: string) {
  const { error } = await supabase
    .from("notification_states")
    .upsert({ notification_id: id, user_id: uid, hidden_at: new Date().toISOString() });
  if (error) throw error;
}

export async function hideNotificationForAdmin(id: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Please log in");
  await hideNotificationForUser(id, data.user.id);
}
