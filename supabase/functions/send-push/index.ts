import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { z } from "npm:zod@3.23.8";

const Body = z.object({ notification_id: z.string().uuid() });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { data: n, error: nErr } = await admin
      .from("notifications")
      .select("id, title, body, audience, target_tier, user_id, link")
      .eq("id", parsed.data.notification_id)
      .single();
    if (nErr || !n) return json({ error: "Notification not found" }, 404);

    let userIds: string[];
    if (n.user_id) {
      userIds = [n.user_id];
    } else {
      let q = admin.from("profiles").select("id");
      if (n.audience === "members") q = q.eq("member_kind", "member");
      if (n.audience === "open") q = q.eq("member_kind", "open");
      if (n.target_tier) q = q.eq("tier", n.target_tier);
      const { data: ps, error } = await q;
      if (error) throw error;
      userIds = (ps ?? []).map((p) => p.id);
    }
    if (userIds.length === 0) return json({ sent: 0 });

    const { data: tokens, error: tErr } = await admin
      .from("push_tokens")
      .select("id, token")
      .in("user_id", userIds);
    if (tErr) throw tErr;

    webpush.setVapidDetails(
      "mailto:admin@wavenharperfitness.app",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );
    const payload = JSON.stringify({ title: n.title, body: n.body, link: n.link ?? "/notifications" });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      (tokens ?? []).map(async (t) => {
        try {
          await webpush.sendNotification(JSON.parse(t.token), payload);
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410 || e instanceof SyntaxError) stale.push(t.id);
          else console.error("push failed", code);
        }
      }),
    );
    if (stale.length) await admin.from("push_tokens").delete().in("id", stale);
    return json({ sent, removed: stale.length });
  } catch (e) {
    console.error(e);
    return json({ error: "Failed to send" }, 500);
  }
});
