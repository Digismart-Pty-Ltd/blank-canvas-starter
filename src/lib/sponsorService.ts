import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  order: number;
};

export function subscribeToSponsors(cb: (sponsors: Sponsor[]) => void) {
  const q = query(collection(db, "sponsors"), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Sponsor[]);
  });
}

export async function createSponsor(data: Omit<Sponsor, "id">) {
  return addDoc(collection(db, "sponsors"), { ...data, createdAt: serverTimestamp() });
}

export async function updateSponsorOrder(id: string, order: number) {
  return updateDoc(doc(db, "sponsors", id), { order });
}

export async function deleteSponsor(id: string) {
  return deleteDoc(doc(db, "sponsors", id));
}

export async function updateSponsor(id: string, data: Partial<Omit<Sponsor, "id">>) {
  await updateDoc(doc(db, "sponsors", id), data);
}

export async function uploadSponsorLogo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const path = `sponsors/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}