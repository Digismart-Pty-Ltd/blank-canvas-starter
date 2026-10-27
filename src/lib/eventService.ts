import { supabase } from "@/integrations/supabase/client";
import { toEvent, type EventRow } from "@/lib/api/events";
import { compressImage, safeName } from "@/lib/imageCompress";
import type { Event } from "./demo-data";

type EventInput = Partial<Omit<Event, "id" | "attendees">> & {
  imageOrientation?: string | null;
  distanceDisplay?: string | null;
};

const COLS =
  "id, title, event_date, event_time, meeting_place, after_run_place, description, image_url, members_only, distance_km, distance_display, image_orientation";

function toRow(d: EventInput) {
  const row: Record<string, unknown> = {};
  if (d.title !== undefined) row.title = d.title;
  if (d.date !== undefined) row.event_date = d.date;
  if (d.time !== undefined) row.event_time = d.time || null;
  if (d.meetingPlace !== undefined) row.meeting_place = d.meetingPlace;
  if (d.afterRunPlace !== undefined) row.after_run_place = d.afterRunPlace;
  if (d.description !== undefined) row.description = d.description;
  if (d.image !== undefined) row.image_url = d.image || null;
  if (d.membersOnly !== undefined) row.members_only = d.membersOnly;
  if (d.imageOrientation !== undefined) row.image_orientation = d.imageOrientation;
  if (d.distanceKm !== undefined) {
    const n = Number(d.distanceKm);
    const numeric = d.distanceKm !== "" && Number.isFinite(n);
    row.distance_km = numeric ? n : null;
    row.distance_display = numeric ? (d.distanceDisplay ?? null) : String(d.distanceKm) || null;
  }
  return row;
}

/** Compress and upload an event photo to private storage. Returns the stored path. */
export async function uploadEventImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  onProgress?.(5);
  const blob = await compressImage(file, 1200);
  onProgress?.(40);
  const path = `events/${Date.now()}-${safeName(file.name)}.jpg`;
  const { error } = await supabase.storage
    .from("event-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  onProgress?.(100);
  return path;
}

export async function createEventRecord(data: EventInput): Promise<string> {
  const { data: row, error } = await supabase
    .from("events")
    .insert(toRow(data) as never)
    .select("id")
    .single();
  if (error) throw error;
  return row.id;
}

export async function updateEventRecord(id: string, data: EventInput) {
  const { error } = await supabase.from("events").update(toRow(data) as never).eq("id", id);
  if (error) throw error;
}

/** Events with bookings are archived (hidden, bookings kept); others are deleted. */
export async function removeEventRecord(id: string): Promise<"archived" | "deleted"> {
  const { count, error: cErr } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);
  if (cErr) throw cErr;
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("events").update({ archived: true }).eq("id", id);
    if (error) throw error;
    return "archived";
  }
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
  return "deleted";
}

/** Live list of non-archived events, oldest first. */
export function subscribeToEvents(callback: (events: Event[]) => void): () => void {
  let alive = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(COLS)
      .eq("archived", false)
      .order("event_date", { ascending: true });
    if (error) return console.error("Failed to load events:", error);
    if (alive) callback((data as EventRow[]).map(toEvent));
  };
  void load();
  const channel = supabase
    .channel(`admin-events-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => void load())
    .subscribe();
  return () => {
    alive = false;
    supabase.removeChannel(channel);
  };
}
