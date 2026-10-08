import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { arrayUnion } from "firebase/firestore";

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  audience: "all" | "members" | "open";
  minTier?: "Pink" | "Silver" | "Gold" | "Platinum";
  readBy: string[];
  deletedBy?: string[];
  link?: string;
  userId?: string; // if set, this is a personal notification for one user only (e.g. check-in reminder)
};

export function subscribeToNotifications(callback: (notifs: Notification[]) => void) {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
        createdAt: d.data().createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
      })),
    );
  });
}

export async function createNotification(data: Omit<Notification, "id" | "createdAt" | "readBy">) {
  await addDoc(collection(db, "notifications"), {
    ...data,
    readBy: [],
    deletedBy: [],
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(
  notifId: string,
  userId: string,
  currentReadBy: string[],
) {
  if (currentReadBy.includes(userId)) return;
  await updateDoc(doc(db, "notifications", notifId), {
    readBy: [...currentReadBy, userId],
  });
}

export async function savePushToken(userId: string, token: string) {
  await updateDoc(doc(db, "users", userId), {
    fcmTokens: arrayUnion(token),
  });
}

export async function hideNotificationForUser(id: string, uid: string) {
  await updateDoc(doc(db, "notifications", id), {
    deletedBy: arrayUnion(uid),
  });
}

export const ADMIN_CLEAR_KEY = "__admin__";

export async function hideNotificationForAdmin(id: string) {
  await updateDoc(doc(db, "notifications", id), {
    deletedBy: arrayUnion(ADMIN_CLEAR_KEY),
  });
}
