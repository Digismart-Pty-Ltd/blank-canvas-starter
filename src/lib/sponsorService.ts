import { supabase } from "@/integrations/supabase/client";
import { compressImage, safeName } from "@/lib/imageCompress";

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string; // stored path in sponsor-logos (or a legacy full URL)
  websiteUrl: string;
  order: number;
};

export function subscribeToSponsors(cb: (sponsors: Sponsor[]) => void) {
  let alive = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("sponsors")
      .select("id, name, logo_url, website_url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) return console.error("Failed to load sponsors:", error);
    if (alive)
      cb(
        (data ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logo_url ?? "",
          websiteUrl: s.website_url ?? "",
          order: s.sort_order,
        })),
      );
  };
  void load();
  const channel = supabase
    .channel(`admin-sponsors-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, () => void load())
    .subscribe();
  return () => {
    alive = false;
    supabase.removeChannel(channel);
  };
}

function toRow(d: Partial<Omit<Sponsor, "id">>) {
  const r: Record<string, unknown> = {};
  if (d.name !== undefined) r.name = d.name;
  if (d.logoUrl !== undefined) r.logo_url = d.logoUrl || null;
  if (d.websiteUrl !== undefined) r.website_url = d.websiteUrl || null;
  if (d.order !== undefined) r.sort_order = d.order;
  return r;
}

export async function createSponsor(data: Omit<Sponsor, "id">) {
  const { error } = await supabase.from("sponsors").insert(toRow(data) as never);
  if (error) throw error;
}

export async function updateSponsorOrder(id: string, order: number) {
  return updateSponsor(id, { order });
}

export async function deleteSponsor(id: string) {
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSponsor(id: string, data: Partial<Omit<Sponsor, "id">>) {
  const { error } = await supabase.from("sponsors").update(toRow(data) as never).eq("id", id);
  if (error) throw error;
}

export async function uploadSponsorLogo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  onProgress?.(10);
  const blob = await compressImage(file, 800);
  const path = `sponsors/${Date.now()}-${safeName(file.name)}.jpg`;
  const { error } = await supabase.storage.from("sponsor-logos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  onProgress?.(100);
  return path;
}
