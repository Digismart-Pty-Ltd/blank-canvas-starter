import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ImageBucket = "event-images" | "sponsor-logos" | "advert-images";

const TTL_MS = 60 * 60 * 1000; // signed URLs valid for 1 hour
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Turn a stored image value into a displayable URL.
 * - Legacy full http(s) URLs are returned as is.
 * - Anything else is treated as a path in the given private bucket and signed for 1 hour.
 */
export async function resolveImageUrl(
  value: string | null | undefined,
  bucket: ImageBucket,
): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;

  const key = `${bucket}/${value}`;
  const hit = cache.get(key);
  // refresh a few minutes before expiry
  if (hit && hit.expires - 5 * 60 * 1000 > Date.now()) return hit.url;

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value, TTL_MS / 1000);
    inflight.delete(key);
    if (error || !data?.signedUrl) return null;
    cache.set(key, { url: data.signedUrl, expires: Date.now() + TTL_MS });
    return data.signedUrl;
  })();
  inflight.set(key, p);
  return p;
}

export function useImageUrl(value: string | null | undefined, bucket: ImageBucket) {
  const [url, setUrl] = useState<string | null>(() =>
    value && /^https?:\/\//i.test(value) ? value : null,
  );
  useEffect(() => {
    let alive = true;
    resolveImageUrl(value, bucket)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [value, bucket]);
  return url;
}
