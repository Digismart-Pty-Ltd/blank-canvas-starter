import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MyRegistration = {
  id: string;
  eventId: string;
  checkedInAt: string | null;
};

export const CHECK_IN_MESSAGES = [
  "Check-in is not open for this event",
  "Invalid check-in code",
  "Already checked in",
  "Registration not found",
  "Check-in is not configured",
];

export async function fetchMyRegistrations(userId: string): Promise<MyRegistration[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id, event_id, checked_in_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    eventId: r.event_id,
    checkedInAt: r.checked_in_at,
  }));
}

/** Only these fields are sent; the server sets tier, open_runner, check-in and reminder fields. */
export async function registerForEvent(input: {
  eventId: string;
  userId: string;
  name: string;
  contact: string;
  emergency: string;
}) {
  const { error } = await supabase.from("event_registrations").insert({
    event_id: input.eventId,
    user_id: input.userId,
    name: input.name,
    contact: input.contact,
    emergency: input.emergency,
  });
  if (error) throw error;
}

/** Returns false when nothing was deleted (e.g. already checked in). */
export async function cancelRegistration(registrationId: string, userId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("id", registrationId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function checkIn(registrationId: string, code: string) {
  const { error } = await supabase.rpc("check_in", {
    p_registration_id: registrationId,
    p_code: code,
  });
  if (error) throw error;
}

export async function fetchRegistrationCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("event_registration_counts")
    .select("event_id, registrations");
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data ?? []) {
    if (r.event_id) out[r.event_id] = Number(r.registrations ?? 0);
  }
  return out;
}

/** The signed-in member's own registrations, kept live via realtime. */
export function useMyRegistrations(userId: string | null | undefined) {
  const [regs, setRegs] = useState<MyRegistration[]>([]);

  const reload = useCallback(async () => {
    if (!userId) {
      setRegs([]);
      return;
    }
    try {
      setRegs(await fetchMyRegistrations(userId));
    } catch (err) {
      console.error("Failed to load registrations:", err);
    }
  }, [userId]);

  useEffect(() => {
    reload();
    if (!userId) return;
    const channel = supabase
      .channel(`my-regs-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_registrations",
          filter: `user_id=eq.${userId}`,
        },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  return { regs, reload };
}

/** Attendee counts per event. Refetched every 60 seconds and on demand. */
export function useRegistrationCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const reload = useCallback(async () => {
    try {
      setCounts(await fetchRegistrationCounts());
    } catch (err) {
      console.error("Failed to load registration counts:", err);
    }
  }, []);

  useEffect(() => {
    reload();
    const t = window.setInterval(reload, 60_000);
    return () => window.clearInterval(t);
  }, [reload]);

  return { counts, reload };
}
