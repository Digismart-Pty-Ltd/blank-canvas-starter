import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase"; // make sure `storage` is exported from firebase.ts (see note below)

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
  imageUrl?: string;
  dimensions?: string;
  activationDate?: string;
  months?: number;
  expiryDate?: string;
  status: AdvertStatus;
  enabled: boolean;
  createdAt?: any;
}

export function generateAdOrderNumber() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ADV-${rand}`;
}

export function calculateAdvertExpiry(activationDate: string, months: number): string {
  const date = new Date(`${activationDate}T12:00:00`);
  date.setMonth(date.getMonth() + Math.max(1, Math.floor(months)));
  return date.toISOString().slice(0, 10);
}

export function isAdvertisementLive(ad: Advertisement, today = new Date()): boolean {
  if (ad.status !== "approved" || !ad.enabled) return false;
  const todayString = today.toISOString().slice(0, 10);
  if (ad.activationDate && ad.activationDate > todayString) return false;
  if (!ad.expiryDate) return true;
  return ad.expiryDate >= todayString;
}

export function isAdvertisementExpired(ad: Advertisement, today = new Date()): boolean {
  return Boolean(ad.expiryDate && ad.expiryDate < today.toISOString().slice(0, 10));
}

export function subscribeToAdvertisements(cb: (ads: Advertisement[]) => void) {
  const q = query(collection(db, "advertisements"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Advertisement[]),
    (err) => {
      console.error("advertisements onSnapshot error:", err);
      cb([]);
    },
  );
}

// Home page only cares about live, approved adverts — filtered client-side
// so we don't need a composite Firestore index.
export function subscribeToActiveAdvertisements(cb: (ads: Advertisement[]) => void) {
  return subscribeToAdvertisements((ads) =>
    cb(ads.filter((a) => isAdvertisementLive(a))),
  );
}

export async function deactivateExpiredAdvertisements(ads: Advertisement[]) {
  await Promise.all(
    ads
      .filter((ad) => ad.enabled && isAdvertisementExpired(ad))
      .map((ad) => updateAdvertisement(ad.id, { enabled: false })),
  );
}

export async function createAdvertisement(
  data: Omit<Advertisement, "id" | "createdAt" | "status" | "enabled">,
) {
  const docRef = await addDoc(collection(db, "advertisements"), {
    ...data,
    status: "pending",
    enabled: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateAdvertisement(id: string, data: Partial<Advertisement>) {
  await updateDoc(doc(db, "advertisements", id), data as any);
}

export async function deleteAdvertisement(id: string) {
  await deleteDoc(doc(db, "advertisements", id));
}

export async function uploadAdvertLogo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const maxSourceBytes = 50 * 1024 * 1024;
  const maxUploadBytes = 10 * 1024 * 1024;
  if (file.size > maxSourceBytes) {
    throw new Error("Image is too large to process on this device. Please use an image under 50 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  const uploadFile = await new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      let width = image.width;
      let height = image.height;
      let quality = 0.82;
      const maxDimension = 1600;

      const compress = (attempt: number) => {
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("This image could not be processed on this device."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("This image could not be compressed."));
            return;
          }
          if (blob.size <= maxUploadBytes) {
            resolve(blob);
            return;
          }
          if (attempt >= 7) {
            reject(new Error("This image could not be compressed below 10 MB."));
            return;
          }
          width *= 0.8;
          height *= 0.8;
          quality = Math.max(0.45, quality - 0.08);
          compress(attempt + 1);
        }, "image/jpeg", quality);
      };

      compress(0);
    };
    image.onerror = () => {
      reject(new Error("This image format cannot be decoded by this browser. Please convert it to JPG or PNG and try again."));
    };
    image.src = objectUrl;
  }).finally(() => URL.revokeObjectURL(objectUrl));

  const path = `advert-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, uploadFile);
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}