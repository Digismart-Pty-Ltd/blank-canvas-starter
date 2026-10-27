import { supabase } from "@/integrations/supabase/client";
import { compressImage, safeName } from "@/lib/imageCompress";

export type AdvertStatus = "pending" | "approved" | "rejected";
export type AdvertType = "logo" | "banner";

export interface Advertisement {
  id: string;
  orderNumber: string;
  businessName: string;
  slogan: string;
  logoUrl: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  isMember: boolean;
  price: number;
  adType?: AdvertType;
  imageUrl?: string; // stored path in advert-images (or a legacy full URL)
  dimensions?: string;
  activationDate?: string;
  months?: number;
  expiryDate?: string;
  status: AdvertStatus;
  enabled: boolean;
  createdAt?: string;
}

export function calculateAdvertExpiry(activationDate: string, months: number): string {
  const date = new Date(`${activationDate}T12:00:00`);
  date.setMonth(date.getMonth() + Math.max(1, Math.floor(months)));
  return date.toISOString().slice(0, 10);
}

export function isAdvertisementLive(ad: Advertisement, today = new Date()): boolean {
  if (ad.status !== "approved" || !ad.enabled) return false;
  const t = today.toISOString().slice(0, 10);
  if (ad.activationDate && ad.activationDate > t) return false;
  return !ad.expiryDate || ad.expiryDate >= t;
}

export function isAdvertisementExpired(ad: Advertisement, today = new Date()): boolean {
  return Boolean(ad.expiryDate && ad.expiryDate < today.toISOString().slice(0, 10));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromRow(r: any): Advertisement {
  return {
    id: r.id,
    orderNumber: r.order_number ?? "",
    businessName: r.business_name ?? "",
    slogan: r.slogan ?? "",
    logoUrl: r.logo_url ?? "",
    websiteUrl: r.website_url ?? "",
    contactName: r.contact_name ?? "",
    contactEmail: r.contact_email ?? "",
    contactPhone: r.contact_phone ?? "",
    isMember: !!r.is_member,
    price: Number(r.price ?? 0),
    adType: r.ad_type ?? undefined,
    imageUrl: r.image_url ?? undefined,
    dimensions: r.dimensions ?? undefined,
    activationDate: r.activation_date ?? undefined,
    months: r.months ?? undefined,
    expiryDate: r.expiry_date ?? undefined,
    status: r.status ?? "pending",
    enabled: !!r.enabled,
    createdAt: r.created_at ?? undefined,
  };
}

function live(table: string, select: string, cb: (rows: Advertisement[]) => void) {
  let alive = true;
  const load = async () => {
    const { data, error } = await supabase
      .from(table as "advertisements")
      .select(select)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(`${table} load error:`, error);
      if (alive) cb([]);
      return;
    }
    if (alive) cb((data ?? []).map(fromRow));
  };
  void load();
  const channel = supabase
    .channel(`ads-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "advertisements" }, () => void load())
    .subscribe();
  return () => {
    alive = false;
    supabase.removeChannel(channel);
  };
}

/** Admin: every advert. */
export function subscribeToAdvertisements(cb: (ads: Advertisement[]) => void) {
  return live("advertisements", "*", cb);
}

/** Public: live adverts from the public view. */
export function subscribeToActiveAdvertisements(cb: (ads: Advertisement[]) => void) {
  return live("public_advertisements", "*", (ads) =>
    cb(ads.map((a) => ({ ...a, status: a.status || "approved", enabled: a.enabled || true })).filter((a) => isAdvertisementLive(a))),
  );
}

export async function deactivateExpiredAdvertisements(ads: Advertisement[]) {
  await Promise.all(
    ads.filter((ad) => ad.enabled && isAdvertisementExpired(ad)).map((ad) => updateAdvertisement(ad.id, { enabled: false })),
  );
}

/** Public application — goes through the server function. Returns the order number. */
export async function createAdvertisement(
  data: Omit<Advertisement, "id" | "createdAt" | "status" | "enabled" | "orderNumber" | "expiryDate">,
): Promise<string> {
  const { data: num, error } = await supabase.rpc("submit_advertisement", {
    p_business_name: data.businessName,
    p_slogan: data.slogan,
    p_logo_url: data.logoUrl,
    p_website_url: data.websiteUrl,
    p_contact_name: data.contactName,
    p_contact_email: data.contactEmail,
    p_contact_phone: data.contactPhone,
    p_is_member: data.isMember,
    p_price: data.price,
    p_ad_type: data.adType ?? null,
    p_image_url: data.imageUrl ?? null,
    p_dimensions: data.dimensions ?? null,
    p_activation_date: data.activationDate ?? null,
    p_months: data.months ?? null,
  } as never);
  if (error) throw error;
  return num as unknown as string;
}

export async function updateAdvertisement(id: string, data: Partial<Advertisement>) {
  const r: Record<string, unknown> = {};
  if (data.status !== undefined) r.status = data.status;
  if (data.enabled !== undefined) r.enabled = data.enabled;
  const { error } = await supabase.from("advertisements").update(r as never).eq("id", id);
  if (error) throw error;
}

export async function deleteAdvertisement(id: string) {
  const { error } = await supabase.from("advertisements").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadAdvertLogo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  onProgress?.(10);
  const blob = await compressImage(file, 1600);
  onProgress?.(50);
  const path = `${Date.now()}-${safeName(file.name)}.jpg`;
  const { error } = await supabase.storage.from("advert-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  onProgress?.(100);
  return path;
}
