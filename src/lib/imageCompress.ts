/** Resize to fit maxDim and re-encode as JPEG, shrinking until under maxBytes. */
export async function compressImage(file: File, maxDim = 1600, maxBytes = 10 * 1024 * 1024): Promise<Blob> {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("Image is too large to process on this device. Please use an image under 50 MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(new Error("This image format cannot be decoded by this browser. Please convert it to JPG or PNG."));
      i.src = objectUrl;
    });
    let width = img.width;
    let height = img.height;
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This image could not be processed on this device.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (!blob) throw new Error("This image could not be compressed.");
      if (blob.size <= maxBytes) return blob;
      width *= 0.8;
      height *= 0.8;
      quality = Math.max(0.45, quality - 0.08);
    }
    throw new Error("This image could not be compressed below 10 MB.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function safeName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "image";
}
