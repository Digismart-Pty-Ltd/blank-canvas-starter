import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUserProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
}
