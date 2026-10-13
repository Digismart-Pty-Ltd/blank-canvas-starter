import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Role = "member" | "open" | null;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type MemberStats = { races_total: number; races_this_year: number };

/** Minimal user shape used across the app (kept compatible with older screens). */
export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  role: Role;
  loading: boolean;
  isMember: boolean;
  profile: Profile | null;
  stats: MemberStats | null;
  avatarUrl: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isMember: false,
  profile: null,
  stats: null,
  avatarUrl: null,
  refreshProfile: async () => {},
});

async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setStats(null);
      setAvatarUrl(null);
      return;
    }
    const [{ data: p, error: pErr }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("member_stats")
        .select("races_total, races_this_year")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (pErr) console.error("Failed to load profile:", pErr);
    setProfile(p ?? null);
    setStats(
      s ? { races_total: s.races_total ?? 0, races_this_year: s.races_this_year ?? 0 } : null,
    );
    setAvatarUrl(await signedAvatarUrl(p?.avatar_path));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Defer database calls out of the auth callback
      setTimeout(() => {
        loadProfile(newSession?.user.id ?? null).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id ?? null).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id ?? null);
  }, [loadProfile, session?.user.id]);

  const authUser = session?.user ?? null;
  const user: AppUser | null = authUser
    ? {
        id: authUser.id,
        uid: authUser.id,
        email: authUser.email ?? null,
        displayName:
          profile?.name?.trim() || (authUser.user_metadata?.name as string | undefined) || null,
      }
    : null;

  const role: Role =
    profile?.member_kind === "member" ? "member" : profile?.member_kind === "open" ? "open" : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isMember: role === "member",
        profile,
        stats,
        avatarUrl,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
