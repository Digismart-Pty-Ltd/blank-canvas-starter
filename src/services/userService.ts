import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getCurrentUserProfile() {
  const user = auth.currentUser;

  if (!user) return null;

  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (!snapshot.exists()) return null;

  return snapshot.data();
}
