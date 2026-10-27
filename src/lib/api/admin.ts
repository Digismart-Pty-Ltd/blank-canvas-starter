import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Reward, Tier } from "@/lib/demo-data";

/** Generic live loader: runs `load` now and whenever any of `tables` change. */
function useLive<T>(tables: string[], load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const run = () =>
      load()
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(e?.message ?? "Failed to load"))
        .finally(() => alive && setLoading(false));
    void run();
    let ch = supabase.channel(`admin-${tables.join("-")}-${Math.random().toString(36).slice(2)}`);
    for (const t of tables) ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => void run());
    ch.subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, loading, error };
}

export interface AdminRegistration {
  id: string;
  eventId: string;
  userId: string | null;
  name: string;
  contact?: string;
  emergency?: string;
  openRunner: boolean;
  tier?: string;
  checkedInAt: string | null;
  createdAt: string;
}

export function useAdminRegistrations() {
  const { data, loading, error } = useLive<AdminRegistration[]>(
    ["event_registrations"],
    async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, user_id, name, contact, emergency, open_runner, tier, checked_in_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id,
        name: r.name,
        contact: r.contact ?? undefined,
        emergency: r.emergency ?? undefined,
        openRunner: r.open_runner,
        tier: r.tier ?? undefined,
        checkedInAt: r.checked_in_at,
        createdAt: r.created_at,
      }));
    },
    [],
  );
  return { registrations: data, loading, error };
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  contact?: string;
  emergency?: string;
  joined: string;
  races: number;
  tier: Tier;
  role: "member";
  waiverAccepted: boolean;
  waiverAcceptedAt?: string;
}

export function useAdminMembers() {
  const { data, loading, error } = useLive<AdminMember[]>(
    ["profiles"],
    async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, contact, emergency, joined, tier, member_kind, waiver_accepted, waiver_accepted_at")
        .eq("member_kind", "member")
        .order("joined", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        contact: p.contact ?? undefined,
        emergency: p.emergency ?? undefined,
        joined: p.joined,
        races: 0,
        tier: p.tier as Tier,
        role: "member" as const,
        waiverAccepted: p.waiver_accepted,
        waiverAcceptedAt: p.waiver_accepted_at ?? undefined,
      }));
    },
    [],
  );
  return { members: data, loading, error };
}

export async function setMemberTier(userId: string, tier: Tier) {
  const { error } = await supabase.rpc("admin_set_tier", { p_user: userId, p_tier: tier });
  if (error) throw error;
}

export async function adminCheckIn(registrationId: string) {
  const { error } = await supabase
    .from("event_registrations")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", registrationId);
  if (error) throw error;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  batched: boolean;
  createdAt: string;
  lines: { product: string; colour: string; size: string; qty: number }[];
}

export function useAdminOrders() {
  const { data, loading } = useLive<AdminOrder[]>(
    ["orders"],
    async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, name, email, phone, notes, batched, created_at, order_lines(product, colour, size, qty)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        name: o.name,
        email: o.email,
        phone: o.phone ?? "",
        notes: o.notes ?? "",
        batched: o.batched,
        createdAt: o.created_at,
        lines: (o.order_lines ?? []).map((l) => ({
          product: l.product,
          colour: l.colour ?? "",
          size: l.size ?? "",
          qty: l.qty,
        })),
      }));
    },
    [],
  );
  return { orders: data, loading };
}

/** Emails all un-batched orders to the admin and marks them batched. Returns how many. */
export async function sendOrderBatch(): Promise<number> {
  const { data, error } = await supabase.rpc("admin_send_order_batch");
  if (error) throw error;
  return data ?? 0;
}

export async function deleteOrders(ids: string[]) {
  if (ids.length === 0) return;
  const { error: lErr } = await supabase.from("order_lines").delete().in("order_id", ids);
  if (lErr) throw lErr;
  const { error } = await supabase.from("orders").delete().in("id", ids);
  if (error) throw error;
}

export type AdminReward = Reward & { createdAt: string };

export function useAdminRewards() {
  const { data } = useLive<AdminReward[]>(
    ["rewards"],
    async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, tier, title, description, expires_in_days, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        tier: r.tier as Reward["tier"],
        title: r.title,
        description: r.description ?? "",
        expiresInDays: r.expires_in_days ?? 0,
        createdAt: r.created_at,
      }));
    },
    [],
  );
  return data;
}

function rewardRow(d: Omit<Reward, "id">) {
  return {
    tier: d.tier,
    title: d.title,
    description: d.description,
    expires_in_days: d.expiresInDays ? Number(d.expiresInDays) : null,
  };
}

export async function createRewardRecord(d: Omit<Reward, "id">) {
  const { error } = await supabase.from("rewards").insert(rewardRow(d));
  if (error) throw error;
}

export async function updateRewardRecord(id: string, d: Omit<Reward, "id">) {
  const { error } = await supabase.from("rewards").update(rewardRow(d)).eq("id", id);
  if (error) throw error;
}

export async function deleteRewardRecord(id: string) {
  const { error } = await supabase.from("rewards").delete().eq("id", id);
  if (error) throw error;
}

/** Live QR/redeem codes from server settings (admin only). */
export function useAppSettings() {
  const { data } = useLive<Record<string, string>>(
    ["app_settings"],
    async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    },
    {},
  );
  return data;
}
