import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/lib/demo-data";

export type AppEvent = Event & {
  distanceDisplay?: string | null;
  imageOrientation?: string | null;
};

type Row = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  meeting_place: string | null;
  after_run_place: string | null;
  description: string | null;
  image_url: string | null;
  members_only: boolean;
  distance_km: number | null;
  distance_display: string | null;
  image_orientation: string | null;
};

function toEvent(r: Row): AppEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.event_date,
    time: (r.event_time ?? "").slice(0, 5),
    meetingPlace: r.meeting_place ?? "",
    afterRunPlace: r.after_run_place ?? "",
    description: r.description ?? "",
    image: r.image_url ?? "", // raw value — resolve with useImageUrl(…, "event-images")
    membersOnly: r.members_only,
    distanceKm: r.distance_km ?? "",
    distanceDisplay: r.distance_display,
    imageOrientation: r.image_orientation,
    attendees: [],
  };
}

export async function fetchEvents(): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, event_date, event_time, meeting_place, after_run_place, description, image_url, members_only, distance_km, distance_display, image_orientation",
    )
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return (data as Row[]).map(toEvent);
}

/** All events, kept live via realtime. */
export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchEvents()
        .then((e) => alive && setEvents(e))
        .catch((err) => console.error("Failed to load events:", err))
        .finally(() => alive && setLoaded(true));
    load();

    const channel = supabase
      .channel(`events-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();

    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { events, loaded };
}
