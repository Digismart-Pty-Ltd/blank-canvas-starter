import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

export async function registerMember(data: {
  name: string;
  email: string;
  password: string;
  idNumber: string;
  contact: string;
  emergency: string;
}) {
  const { data: res, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        name: data.name,
        id_number: data.idNumber,
        contact: data.contact,
        emergency: data.emergency,
        member_kind: "member",
        waiver_accepted: "true",
      },
    },
  });
  if (error) throw error;
  return res;
}

export async function registerOpenRunner(data: { name: string; email: string; password: string }) {
  const { data: res, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { name: data.name, member_kind: "open", waiver_accepted: "true" },
    },
  });
  if (error) throw error;
  return res;
}

export async function upgradeToMember(data: {
  name: string;
  idNumber: string;
  contact: string;
  emergency: string;
}) {
  const { error } = await supabase.rpc("become_member", {
    p_name: data.name,
    p_id_number: data.idNumber,
    p_contact: data.contact,
    p_emergency: data.emergency,
  });
  if (error) throw error;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

// Admin page only — left unchanged until the admin page is migrated.
export async function signInAsAdmin(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}
