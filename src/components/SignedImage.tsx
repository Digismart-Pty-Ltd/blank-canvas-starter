import type { ImgHTMLAttributes } from "react";
import { useImageUrl, type ImageBucket } from "@/lib/api/images";

/** <img> that resolves a stored path in a private bucket (or a full URL) to a displayable link. */
export function SignedImage({
  value,
  bucket,
  ...rest
}: { value: string | null | undefined; bucket: ImageBucket } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const url = useImageUrl(value, bucket);
  if (!url) return null;
  return <img src={url} {...rest} />;
}
