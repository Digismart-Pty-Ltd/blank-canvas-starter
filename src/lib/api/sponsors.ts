import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicSponsor = {
  id: string;
  name: string;
  logoUrl: string | null; // raw value — resolve with useImageUrl(…, "sponsor-logos")
  websiteUrl: string | null;
  sortOrder: number;
};

export async function fetchSponsors(): Promise<PublicSponsor[]> {
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    logoUrl: s.logo_url,
    websiteUrl: s.website_url,
    sortOrder: s.sort_order,
  }));
}

export function useSponsors() {
  const [sponsors, setSponsors] = useState<PublicSponsor[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchSponsors()
        .then((s) => alive && setSponsors(s))
        .catch((err) => console.error("Failed to load sponsors:", err));
    load();

    const channel = supabase
      .channel(`sponsors-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, load)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return sponsors;
}
