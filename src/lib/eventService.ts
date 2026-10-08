import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { Event } from "./demo-data";

const EVENTS_COL = "events";

// ── Resize/compress an image file, then upload it to Firebase Storage ───────
// Returns a download URL that gets stored on the event doc — never a base64
// blob — so Firestore docs stay tiny and the admin/events lists don't have
// to decode multi-hundred-KB strings per event in memory (this was the
// source of the Android OOM crashes on the admin Events tab).
export async function uploadEventImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(5);

  const objectUrl = URL.createObjectURL(file);

  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        // Cap at 1200px wide/tall to keep uploads small and fast to load
        const MAX_W = 1200;
        const MAX_H = 1200;
        let { width, height } = img;

        if (width > MAX_W) {
          height = Math.round((height * MAX_W) / width);
          width = MAX_W;
        }
        if (height > MAX_H) {
          width = Math.round((width * MAX_H) / height);
          height = MAX_H;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not available");

        // White background so transparent PNGs look correct as JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Could not compress image."));
          },
          "image/jpeg",
          0.82,
        );
      } catch (canvasErr) {
        // Canvas fallback — upload the original file untouched
        console.error("Canvas compression failed, falling back to raw file:", canvasErr);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image. Try a different file."));
    };

    img.src = objectUrl;
  });

  const path = `events/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, blob);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(Math.max(pct, 5));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}

// ── Create event document in Firestore ───────────────────────────────────────
export async function createEventInFirestore(
  data: Omit<Event, "id" | "attendees">,
): Promise<string> {
  const docRef = await addDoc(collection(db, EVENTS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ── Update event document in Firestore ───────────────────────────────────────
export async function updateEventInFirestore(
  id: string,
  data: Partial<Omit<Event, "id" | "attendees">>,
) {
  await updateDoc(doc(db, EVENTS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Delete event document from Firestore ─────────────────────────────────────
export async function deleteEventFromFirestore(id: string) {
  await deleteDoc(doc(db, EVENTS_COL, id));
}

// ── Real-time listener — calls back with sorted events array ─────────────────
export function subscribeToEvents(callback: (events: Event[]) => void): () => void {
  const q = query(collection(db, EVENTS_COL), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const events: Event[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Event, "id">),
    }));
    callback(events);
  });
}