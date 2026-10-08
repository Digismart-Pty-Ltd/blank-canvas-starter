import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export async function registerMember(data: {
  name: string;
  email: string;
  password: string;
  idNumber: string;
  contact: string;
  emergency: string;
}) {
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
  await updateProfile(cred.user, { displayName: data.name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name: data.name,
    email: data.email,
    idNumber: data.idNumber,
    contact: data.contact,
    emergency: data.emergency,
    role: "member",
    races: 0,
    tier: "Pink",
    joined: new Date().toISOString(),
    createdAt: Date.now(),
    waiverAccepted: true,
    waiverAcceptedAt: new Date().toISOString(),
  });
  return cred.user;
}

export async function registerOpenRunner(data: { name: string; email: string; password: string }) {
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
  await updateProfile(cred.user, { displayName: data.name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name: data.name,
    email: data.email,
    role: "open",
    joined: new Date().toISOString(),
    createdAt: Date.now(),
    waiverAccepted: true,
    waiverAcceptedAt: new Date().toISOString(),
  });
  return cred.user;
}

export async function upgradeToMember(data: {
  idNumber: string;
  contact: string;
  emergency: string;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user.");

  await updateDoc(doc(db, "users", currentUser.uid), {
    idNumber: data.idNumber,
    contact: data.contact,
    emergency: data.emergency,
    role: "member",
    races: 0,
    tier: "Pink",
    upgradedAt: Date.now(),
    waiverAccepted: true,
    waiverAcceptedAt: new Date().toISOString(),
  });
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function signInAsAdmin(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}
