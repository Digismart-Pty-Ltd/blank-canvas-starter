import { createContext, useContext, type ReactNode } from "react";
import type { Member, Tier } from "./demo-data";

/**
 * Legacy shared store, kept only as a thin compatibility layer.
 * All real data now comes from Lovable Cloud (see AuthContext and src/lib/api/*).
 */

export function tierFor(races: number): Tier {
  if (races >= 36) return "Platinum";
  if (races >= 24) return "Gold";
  if (races >= 12) return "Silver";
  return "Pink";
}

export function nextTierInfo(races: number) {
  const targets: Array<[Tier, number]> = [
    ["Silver", 12],
    ["Gold", 24],
    ["Platinum", 36],
  ];
  for (const [t, n] of targets) if (races < n) return { next: t, needed: n - races, target: n };
  return { next: "Platinum" as Tier, needed: 0, target: 36 };
}

type Ctx = {
  state: { members: Member[] };
  currentMember: Member | null;
  currentOpen: { id: string; name: string; email: string; lastRun: string } | null;
  logout: () => void;
  syncAuthUser: (email: string | null, displayName: string | null, role: string | null) => void;
};

const value: Ctx = {
  state: { members: [] },
  currentMember: null,
  currentOpen: null,
  logout: () => localStorage.removeItem("wh_admin_session"),
  syncAuthUser: () => {},
};

const StoreCtx = createContext<Ctx>(value);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  return useContext(StoreCtx);
}
