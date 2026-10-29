import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.24.2";

const cors = corsHeaders;
const cloudUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!cloudUrl || !serviceKey) throw new Error("Import service configuration missing");
const sb = createClient(
  cloudUrl,
  serviceKey,
  { auth: { persistSession: false } },
);


// Validate the complete batch before any writes. Unknown fields are ignored.
const text = z.string().max(10000);
const nullableText = text.nullish();
const idValue = z.string().min(1).max(255);
const dateValue = z.union([
  z.string().max(100).refine((v) => Number.isFinite(Date.parse(v)), "Invalid date"),
  z.number().finite().refine((v) => Number.isFinite(new Date(v).getTime()), "Invalid date"),
]).nullish();
const nonnegative = z.number().finite().nonnegative().nullish();
const flag = z.boolean().optional();
const imageValue = z.string().max(15_000_000).refine((value) => {
  if (value === "") return true;
  const data = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (data) return data[2].length % 4 === 0;
  return allowedImageUrl(value);
}, "Unsupported image source").nullish();
const userRow = z.object({
  id: idValue, email: z.string().trim().email().max(254), name: nullableText,
  idNumber: nullableText, contact: nullableText, emergency: nullableText,
  role: z.enum(["open", "member", "admin"]).optional(), waiverAccepted: flag,
  tier: nullableText, rewardsPending: nonnegative, lastRun: dateValue,
  joined: dateValue, createdAt: dateValue, waiverAcceptedAt: dateValue,
  avatarUrl: imageValue, tierResetAt: dateValue, lastTierCheck: dateValue,
  tierDowngradedAt: dateValue, upgradedAt: dateValue,
});
const rowSchemas = {
  ping: z.object({}).strict(),
  users: userRow,
  profiles: userRow,
  events: z.object({
    id: idValue, title: z.string().min(1).max(1000), date: dateValue,
    time: z.string().regex(/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).nullish(),
    meetingPlace: nullableText, afterRunPlace: nullableText, description: nullableText,
    image: imageValue, membersOnly: flag, distanceKm: nonnegative,
    createdAt: dateValue, updatedAt: dateValue,
  }),
  eventRegistrations: z.object({
    id: idValue, eventId: idValue, userId: idValue.nullish(), name: nullableText,
    contact: nullableText, emergency: nullableText, openRunner: flag, tier: nullableText,
    checkedInAt: dateValue, reminderSent: flag, createdAt: dateValue,
  }),
  notifications: z.object({
    id: idValue, title: nullableText, body: nullableText, audience: nullableText,
    minTier: nullableText, userId: idValue.nullish(), link: nullableText,
    createdAt: dateValue, readBy: z.array(idValue).max(5000).optional(),
    deletedBy: z.array(idValue).max(5000).optional(),
  }),
  advertisements: z.object({
    id: idValue, orderNumber: idValue, businessName: z.string().min(1).max(1000),
    slogan: nullableText, logoUrl: imageValue, websiteUrl: nullableText,
    contactName: nullableText, contactEmail: z.string().email().max(254).nullish(),
    contactPhone: nullableText, isMember: flag, price: nonnegative, adType: nullableText,
    imageUrl: imageValue, dimensions: nullableText, activationDate: dateValue,
    months: z.number().int().nonnegative().nullish(), expiryDate: dateValue,
    status: nullableText, enabled: flag, createdAt: dateValue,
  }),
  orders: z.object({
    id: idValue, orderNumber: idValue, name: nullableText,
    email: z.string().email().max(254), phone: nullableText, notes: nullableText,
    batched: flag, createdAt: dateValue,
    lines: z.array(z.object({ product: nullableText, colour: nullableText,
      size: nullableText, qty: z.number().int().positive().max(10000).optional(),
    })).max(200).optional(),
  }),
};
const requestSchema = z.object({
  token: z.string().min(1).max(24576),
  step: z.enum(["ping", "users", "profiles", "events", "eventRegistrations", "notifications", "advertisements", "orders"]),
  rows: z.array(z.unknown()).max(200).default([]),
}).strict();

// Only Firebase/Google Storage downloads are allowed; no redirects or private hosts.
function allowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") &&
      ["firebasestorage.googleapis.com", "storage.googleapis.com"].includes(url.hostname);
  } catch { return false; }
}
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
async function readLimited(stream: ReadableStream<Uint8Array> | null, maximum: number) {
  if (!stream) throw new Error("Empty request or file");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maximum) { await reader.cancel(); throw new Error("Size limit exceeded"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
// Errors never echo URLs, database details, record values, or credentials.
const safeWarning = (message: string) => {
  const category = message.startsWith("MISSING FILE") ? "MISSING FILE" :
    message.startsWith("UPLOAD FAILED") ? "UPLOAD FAILED" :
    message.startsWith("Duplicate registration") ? "DUPLICATE REGISTRATION" :
    message.startsWith("SKIPPED") || message.startsWith("Registration") ? "SKIPPED RECORD" :
    message.includes("not allowed") ? "UNSUPPORTED VALUE" : "IMPORT WARNING";
  return `${category}: inspect the source record locally; details withheld for privacy`;
};

const TIERS = ["Pink", "Silver", "Gold", "Platinum"];
const AUDIENCES = ["all", "members", "open"];
const AD_STATUS = ["pending", "approved", "rejected"];
const AD_TYPES = ["logo", "banner"];
const ALIASES: Record<string, string> = { active: "approved", live: "approved", declined: "rejected" };

type Warn = (m: string) => void;
const nowIso = () => new Date().toISOString();
const ts = (v: any) => v ?? nowIso();
const dateOnly = (v: any) => {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const timeOnly = (v: any) => {
  const m = String(v ?? "").match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
};
const safe = (s: any) => String(s).replace(/[^\w.-]/g, "_");
const pick = (list: string[], v: any, fallback: string | null, label: string, id: any, warn: Warn) => {
  const x = ALIASES[v] ?? v;
  if (list.includes(x)) return x;
  if (v != null && v !== "") warn(`${label} "${v}" not allowed (record ${id}); used ${fallback}`);
  return fallback;
};
const b64 = (s: string) => {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
};

async function storeImage(value: any, bucket: string, path: string, warn: Warn) {
  if (!value || typeof value !== "string") return null;
  let bytes: Uint8Array, type: string;
  const m = value.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (m) {
    type = m[1];
    bytes = b64(m[2]);
  } else if (allowedImageUrl(value)) {
    try {
      const res = await fetch(value, { redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!res.ok) { warn("MISSING FILE"); return value; }
      type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!allowedImageTypes.includes(type)) { await res.body?.cancel(); warn("UPLOAD FAILED"); return null; }
      bytes = await readLimited(res.body, bucket === "avatars" ? 2 * 1024 * 1024 : 10 * 1024 * 1024);
    } catch { warn("MISSING FILE"); return value; }
  } else {
    warn("UPLOAD FAILED");
    return null;
  }
  if (!allowedImageTypes.includes(type) || bytes.length > (bucket === "avatars" ? 2 * 1024 * 1024 : 10 * 1024 * 1024)) {
    warn("UPLOAD FAILED"); return null;
  }
  const ext = type.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
  const full = `${path}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(full, bytes, { contentType: type, upsert: true });
  if (error) { warn(`UPLOAD FAILED ${bucket}/${full}: ${error.message}`); return null; }
  return full;
}

async function upsert(table: string, rows: any[], onConflict: string) {
  if (!rows.length) return [];
  const { data, error } = await sb.from(table).upsert(rows, { onConflict }).select();
  if (error) throw new Error("Import database operation failed");
  return data ?? [];
}
async function mapBy(table: string, col: string): Promise<Record<string, string>> {
  const { data, error } = await sb.from(table).select(`id,${col}`).limit(5000);
  if (error) throw new Error("Import database operation failed");
  return Object.fromEntries((data ?? []).filter((r: any) => r[col]).map((r: any) => [r[col], r.id]));
}

const steps: Record<string, (rows: any[], warn: Warn) => Promise<number>> = {
  ping: async () => 0,

  // Create auth users (the signup trigger makes profiles) and link legacy_uid
  users: async (rows, warn) => {
    const { data: ps } = await sb.from("profiles").select("id,email").limit(5000);
    const byEmail: Record<string, string> = Object.fromEntries(
      (ps ?? []).map((p: any) => [String(p.email).toLowerCase(), p.id]),
    );
    let n = 0;
    for (const u of rows) {
      const email = String(u.email ?? "").trim().toLowerCase();
      if (!email) continue;
      let id = byEmail[email];
      if (!id) {
        const { data, error } = await sb.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            name: u.name ?? "", id_number: u.idNumber ?? null, contact: u.contact ?? null,
            emergency: u.emergency ?? null, member_kind: u.role === "open" ? "open" : "member",
            waiver_accepted: !!u.waiverAccepted,
          },
        });
        if (error) { warn(`SKIPPED USER ${email}: ${error.message}`); continue; }
        id = data.user.id;
        byEmail[email] = id;
      }
      const { error: e2 } = await sb.from("profiles").update({ legacy_uid: u.id }).eq("id", id);
      if (e2) warn(`legacy_uid ${email}: ${e2.message}`);
      n++;
    }
    return n;
  },

  events: async (rows, warn) => {
    const out: any[] = [];
    for (const e of rows) {
      const event_date = dateOnly(e.date);
      if (!event_date || !e.title) { warn(`SKIPPED EVENT ${e.id}: missing title or valid date`); continue; }
      out.push({
        legacy_id: e.id, title: e.title, event_date, event_time: timeOnly(e.time),
        meeting_place: e.meetingPlace ?? null, after_run_place: e.afterRunPlace ?? null,
        description: e.description ?? null,
        image_url: await storeImage(e.image, "event-images", `events/${safe(e.id)}`, warn),
        members_only: !!e.membersOnly, distance_km: e.distanceKm ?? null,
        created_at: ts(e.createdAt), updated_at: ts(e.updatedAt ?? e.createdAt),
      });
    }
    return (await upsert("events", out, "legacy_id")).length;
  },

  eventRegistrations: async (rows, warn) => {
    const userMap = await mapBy("profiles", "legacy_uid");
    const eventMap = await mapBy("events", "legacy_id");
    const { data: ex } = await sb.from("event_registrations").select("event_id,user_id,legacy_id")
      .not("user_id", "is", null).limit(5000);
    const seen = new Map<string, string>((ex ?? []).map((r: any) => [`${r.event_id}:${r.user_id}`, r.legacy_id]));
    const out: any[] = [];
    for (const r of rows) {
      if (!eventMap[r.eventId]) { warn(`Registration ${r.id} skipped: event ${r.eventId} not imported`); continue; }
      let user_id: string | null = null;
      if (r.userId) {
        user_id = userMap[r.userId] ?? null;
        if (!user_id) warn(`Registration ${r.id}: user ${r.userId} not migrated; imported as unlinked`);
      }
      if (user_id) {
        const k = `${eventMap[r.eventId]}:${user_id}`;
        if (seen.has(k) && seen.get(k) !== r.id) { warn(`Duplicate registration ${r.id} dropped`); continue; }
        seen.set(k, r.id);
      }
      out.push({
        legacy_id: r.id, event_id: eventMap[r.eventId], user_id, name: r.name ?? "",
        contact: r.contact ?? null, emergency: r.emergency ?? null, open_runner: !!r.openRunner,
        tier: pick(TIERS, r.tier, null, "registration tier", r.id, warn),
        checked_in_at: r.checkedInAt ?? null, reminder_sent: !!r.reminderSent, created_at: ts(r.createdAt),
      });
    }
    return (await upsert("event_registrations", out, "legacy_id")).length;
  },

  notifications: async (rows, warn) => {
    const userMap = await mapBy("profiles", "legacy_uid");
    const out: any[] = [];
    const src: any[] = [];
    for (const n of rows) {
      const audience = n.audience == null ? "all" : pick(AUDIENCES, n.audience, null, "audience", n.id, warn);
      if (!audience) { warn(`Notification ${n.id} skipped (unknown audience)`); continue; }
      if (n.userId && !userMap[n.userId]) continue; // targeted at an unmigrated user: skip, don't broadcast
      src.push(n);
      out.push({
        legacy_id: n.id, title: n.title ?? "", body: n.body ?? "", audience,
        target_tier: pick(TIERS, n.minTier, null, "minTier", n.id, warn),
        user_id: n.userId ? userMap[n.userId] : null, link: n.link ?? null, created_at: ts(n.createdAt),
      });
    }
    const saved = await upsert("notifications", out, "legacy_id");
    const nMap = Object.fromEntries(saved.map((r: any) => [r.legacy_id, r.id]));
    const states: Record<string, any> = {};
    for (const n of src) {
      for (const [field, col] of [["readBy", "read_at"], ["deletedBy", "hidden_at"]]) {
        for (const uid of n[field] ?? []) {
          if (!userMap[uid] || !nMap[n.id]) continue;
          const key = `${n.id}:${uid}`;
          states[key] ??= { notification_id: nMap[n.id], user_id: userMap[uid], read_at: null, hidden_at: null };
          states[key][col] = ts(n.createdAt);
        }
      }
    }
    const list = Object.values(states);
    if (list.length) {
      const { error } = await sb.from("notification_states").upsert(list, { onConflict: "notification_id,user_id" });
      if (error) warn(`notification_states: ${error.message}`);
    }
    return saved.length;
  },

  advertisements: async (rows, warn) => {
    const out: any[] = [];
    for (const a of rows) {
      if (!a.orderNumber || !a.businessName) { warn(`SKIPPED ADVERT ${a.id}: missing orderNumber or businessName`); continue; }
      out.push({
        legacy_id: a.id, order_number: a.orderNumber, business_name: a.businessName, slogan: a.slogan ?? null,
        logo_url: await storeImage(a.logoUrl, "advert-images", `logo-${safe(a.id)}`, warn),
        website_url: a.websiteUrl ?? null, contact_name: a.contactName ?? null,
        contact_email: a.contactEmail ?? null, contact_phone: a.contactPhone ?? null,
        is_member: !!a.isMember, price: a.price ?? null,
        ad_type: pick(AD_TYPES, a.adType, null, "advert type", a.id, warn),
        image_url: await storeImage(a.imageUrl, "advert-images", `img-${safe(a.id)}`, warn),
        dimensions: a.dimensions ?? null, activation_date: dateOnly(a.activationDate), months: a.months ?? null,
        expiry_date: dateOnly(a.expiryDate),
        status: pick(AD_STATUS, a.status, "pending", "advert status", a.id, warn),
        enabled: !!a.enabled, created_at: ts(a.createdAt),
      });
    }
    return (await upsert("advertisements", out, "legacy_id")).length;
  },

  orders: async (rows, warn) => {
    const good = rows.filter((o) => {
      if (!o.orderNumber) { warn(`SKIPPED ORDER ${o.id}: no orderNumber`); return false; }
      return true;
    });
    const saved = await upsert("orders", good.map((o) => ({
      legacy_id: o.id, order_number: o.orderNumber, name: o.name ?? "", email: o.email ?? "",
      phone: o.phone ?? null, notes: o.notes ?? null, batched: !!o.batched, created_at: ts(o.createdAt),
    })), "legacy_id");
    const oMap = Object.fromEntries(saved.map((r: any) => [r.legacy_id, r.id]));
    const ids = Object.values(oMap);
    if (ids.length) await sb.from("order_lines").delete().in("order_id", ids as string[]);
    const lines = good.flatMap((o) => (o.lines ?? []).map((l: any) => ({
      order_id: oMap[o.id], product: l.product ?? "Unknown", colour: l.colour ?? null,
      size: l.size ?? null, qty: Math.max(1, Number(l.qty) || 1),
    })));
    if (lines.length) {
      const { error } = await sb.from("order_lines").insert(lines);
      if (error) warn(`order_lines: ${error.message}`);
    }
    return saved.length;
  },

  // Final pass: write the real profile data
  profiles: async (rows, warn) => {
    const userMap = await mapBy("profiles", "legacy_uid");
    let n = 0;
    for (const u of rows) {
      const id = userMap[u.id];
      if (!id) continue;
      const { error } = await sb.from("profiles").update({
        name: u.name ?? "", id_number: u.idNumber ?? null, contact: u.contact ?? null,
        emergency: u.emergency ?? null, member_kind: u.role === "open" ? "open" : "member",
        tier: pick(TIERS, u.tier, "Pink", "user tier", u.id, warn),
        rewards_pending: Number(u.rewardsPending) || 0, last_run: dateOnly(u.lastRun),
        joined: dateOnly(u.joined) ?? dateOnly(u.createdAt) ?? nowIso().slice(0, 10),
        waiver_accepted: !!u.waiverAccepted, waiver_accepted_at: u.waiverAcceptedAt ?? null,
        avatar_path: await storeImage(u.avatarUrl, "avatars", `${id}/avatar`, warn),
        tier_reset_at: u.tierResetAt ?? null, last_tier_check: u.lastTierCheck ?? null,
        tier_downgraded_at: u.tierDowngradedAt ?? null, upgraded_at: u.upgradedAt ?? null,
        created_at: ts(u.createdAt),
      }).eq("id", id);
      if (error) warn(`profile ${u.email}: ${error.message}`); else n++;
    }
    return n;
  },
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const token = Deno.env.get("IMPORT_TOKEN");
  if (!token) return json({ error: "unauthorized" }, 401);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json({ error: "application/json required" }, 415);
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(await readLimited(req.body, 20 * 1024 * 1024)));
  } catch { return json({ error: "invalid or oversized request" }, 400); }
  if (!body || typeof body !== "object" || !("token" in body) || body.token !== token) {
    return json({ error: "unauthorized" }, 401);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request; maximum 200 rows" }, 400);
  const { step, rows } = parsed.data;
  const batch = z.array(rowSchemas[step]).safeParse(rows);
  if (!batch.success) return json({ error: "invalid record fields", fields: batch.error.issues.map((issue) => issue.path.join(".")) }, 400);
  const fn = steps[step];
  if (!fn) return json({ error: "unknown step" }, 400);
  const warnings: string[] = [];
  try {
    const count = await fn(batch.data, (message) => warnings.push(safeWarning(message)));
    return json({ ok: true, count, warnings });
  } catch {
    return json({ error: "Import operation failed; some earlier records may have been saved", warnings }, 500);
  }
});
