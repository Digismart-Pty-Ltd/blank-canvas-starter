import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { subscribeToEvents } from "./eventService";
import type { Event, Member, Reward, Tier } from "./demo-data";

const KEY = "whf:store:v1";
const ADMIN_KEY = "wh_admin_session";

export type CurrentUser =
  | { kind: "member"; id: string }
  | { kind: "open"; id: string }
  | { kind: "admin" }
  | null;

export type Registration = {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  tier?: Tier;
  openRunner?: boolean;
  contact?: string;
  emergency?: string;
  acceptedAt: string;
  checkedInAt?: string;
};

export type Redemption = { id: string; rewardId: string; memberId: string; at: string };

type State = {
  events: Event[];
  members: Member[];
  openRunners: { id: string; name: string; email: string; lastRun: string }[];
  rewards: Reward[];
  registrations: Registration[];
  redemptions: Redemption[];
  currentUserId: string | null;
  currentUserKind: "member" | "open" | "admin" | null;
};

const initial: State = {
  events: [],
  members: [],
  openRunners: [],
  rewards: [],
  registrations: [],
  redemptions: [],
  currentUserId: null,
  currentUserKind: null,
};

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(KEY);
    const isAdmin = localStorage.getItem(ADMIN_KEY) === "1";
    const base = raw ? { ...initial, ...JSON.parse(raw) } : initial;
    return isAdmin ? { ...base, currentUserKind: "admin", currentUserId: null } : base;
  } catch {
    return initial;
  }
}

function save(s: State) {
  if (typeof window === "undefined") return;
  try {
    const { currentUserId, currentUserKind, ...rest } = s;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {}
}

function toIsoDate(value: any) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value.toDate === "function") return value.toDate().toISOString().slice(0, 10);
  if (value.seconds) return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

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
  state: State;
  currentMember: Member | null;
  currentOpen: { id: string; name: string; email: string; lastRun: string } | null;
  currentUser: CurrentUser;
  registerMember: (input: { name: string; email: string }) => Member;
  registerOpenRunner: (input: { name: string; email: string }) => {
    id: string;
    name: string;
    email: string;
    lastRun: string;
  };
  loginByEmail: (email: string) => boolean;
  loginAdmin: () => Promise<void>;
  logout: () => void;
  signUpForEvent: (
    eventId: string,
    fields: { name: string; contact: string; emergency: string },
  ) => Registration | null;
  cancelSignup: (registrationId: string) => void;
  checkIn: (eventId: string) => Registration | null;
  attendeesFor: (eventId: string) => Registration[];
  myRegistrationFor: (eventId: string) => Registration | undefined;
  setEvents: (events: Event[]) => void;
  redeem: (rewardId: string) => void;
  myRedemptions: () => Redemption[];
  syncAuthUser: (email: string | null, displayName: string | null, role: string | null) => void;
  createEvent: (e: Omit<Event, "id" | "attendees">) => void;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  createReward: (r: Omit<Reward, "id">) => void;
  updateReward: (id: string, patch: Partial<Reward>) => void;
  deleteReward: (id: string) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);

  const mutate = useCallback((fn: (s: State) => State) => setState((s) => fn(s)), []);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let unsubscribeEvents = subscribeToEvents((events) => {
      mutate((s) => ({ ...s, events }));
    });

    const refreshEvents = () => {
      unsubscribeEvents();
      unsubscribeEvents = subscribeToEvents((events) => {
        mutate((s) => ({ ...s, events }));
      });
    };

    window.addEventListener("online", refreshEvents);
    document.addEventListener("visibilitychange", refreshEvents);

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const members: Member[] = [];
        const openRunners: { id: string; name: string; email: string; lastRun: string }[] = [];

        snap.docs.forEach((doc) => {
          const data = doc.data() as any;
          if (data.role === "member") {
            members.push({
              id: doc.id,
              name: data.name || "",
              email: data.email || "",
              joined: toIsoDate(data.joined || data.createdAt),
              races: data.races ?? 0,
              tier: data.tier ?? "Pink",
              rewardsPending: data.rewardsPending ?? 0,
            });
          }
          if (data.role === "open") {
            openRunners.push({
              id: doc.id,
              name: data.name || "",
              email: data.email || "",
              lastRun: toIsoDate(data.lastRun || data.createdAt),
            });
          }
        });

        mutate((s) => ({ ...s, members, openRunners }));
      },
      (err) => {
        console.warn("users snapshot error (may resolve after sign-in):", err.code);
      },
    );

    return () => {
      unsubscribeEvents();
      unsubscribeUsers();
      window.removeEventListener("online", refreshEvents);
      document.removeEventListener("visibilitychange", refreshEvents);
    };
  }, [hydrated, mutate]);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  // ── Stable syncAuthUser — reads state inside the updater, never in deps ──
  const syncAuthUser = useCallback(
    (email: string | null, displayName: string | null, role: string | null) => {
      mutate((s) => {
        if (s.currentUserKind === "admin") return s;
        const normalizedEmail = email?.trim().toLowerCase() ?? null;
        if (!normalizedEmail) {
          if (s.currentUserId === null && s.currentUserKind === null) return s;
          return { ...s, currentUserId: null, currentUserKind: null };
        }
        const existingMember = s.members.find((m) => m.email.toLowerCase() === normalizedEmail);
        if (existingMember) {
          if (s.currentUserId === existingMember.id && s.currentUserKind === "member") return s;
          return { ...s, currentUserId: existingMember.id, currentUserKind: "member" };
        }
        const existingOpen = s.openRunners.find((o) => o.email.toLowerCase() === normalizedEmail);
        if (existingOpen) {
          if (s.currentUserId === existingOpen.id && s.currentUserKind === "open") return s;
          return { ...s, currentUserId: existingOpen.id, currentUserKind: "open" };
        }
        if (s.currentUserId === null && s.currentUserKind === null) return s;
        return { ...s, currentUserId: null, currentUserKind: null };
      });
    },
    [mutate],
  ); // ← semicolon, not comma

  const currentMember = useMemo(
    () =>
      state.currentUserKind === "member"
        ? (state.members.find((m) => m.id === state.currentUserId) ?? null)
        : null,
    [state],
  );
  const currentOpen = useMemo(
    () =>
      state.currentUserKind === "open"
        ? (state.openRunners.find((o) => o.id === state.currentUserId) ?? null)
        : null,
    [state],
  );
  const currentUser: CurrentUser =
    state.currentUserKind === "admin"
      ? { kind: "admin" }
      : currentMember
        ? { kind: "member", id: currentMember.id }
        : currentOpen
          ? { kind: "open", id: currentOpen.id }
          : null;

  const ctx: Ctx = {
    state,
    currentMember,
    currentOpen,
    currentUser,
    syncAuthUser,

    registerMember: ({ name, email }) => {
      const m: Member = {
        id: `m-${Date.now()}`,
        name,
        email,
        joined: new Date().toISOString().slice(0, 10),
        races: 0,
        tier: "Pink",
        rewardsPending: 0,
      };
      mutate((s) => ({
        ...s,
        members: [...s.members, m],
        currentUserId: m.id,
        currentUserKind: "member",
      }));
      return m;
    },

    registerOpenRunner: ({ name, email }) => {
      const o = {
        id: `o-${Date.now()}`,
        name,
        email,
        lastRun: new Date().toISOString().slice(0, 10),
      };
      mutate((s) => ({
        ...s,
        openRunners: [...s.openRunners, o],
        currentUserId: o.id,
        currentUserKind: "open",
      }));
      return o;
    },

    loginByEmail: (email) => {
      const m = state.members.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (m) {
        mutate((s) => ({ ...s, currentUserId: m.id, currentUserKind: "member" }));
        return true;
      }
      const o = state.openRunners.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (o) {
        mutate((s) => ({ ...s, currentUserId: o.id, currentUserKind: "open" }));
        return true;
      }
      return false;
    },

    loginAdmin: () => {
      localStorage.setItem(ADMIN_KEY, "1");
      mutate((s) => ({ ...s, currentUserKind: "admin", currentUserId: null }));
    },

    logout: () => {
      if (state.currentUserKind === "admin") {
        localStorage.removeItem(ADMIN_KEY);
      }
      mutate((s) => ({ ...s, currentUserId: null, currentUserKind: null }));
    },

    signUpForEvent: (eventId, fields) => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event) return null;
      const isMember = state.currentUserKind === "member";
      if (event.membersOnly && !isMember) return null;
      const userId = currentMember?.id ?? currentOpen?.id ?? `guest:${fields.name}`;
      if (state.registrations.find((r) => r.eventId === eventId && r.userId === userId))
        return null;
      const reg: Registration = {
        id: `reg-${Date.now()}`,
        eventId,
        userId,
        name: currentMember?.name ?? currentOpen?.name ?? fields.name,
        tier: currentMember?.tier,
        openRunner: !currentMember,
        contact: fields.contact,
        emergency: fields.emergency,
        acceptedAt: new Date().toISOString(),
      };
      mutate((s) => ({ ...s, registrations: [...s.registrations, reg] }));
      return reg;
    },

    cancelSignup: (id) =>
      mutate((s) => ({ ...s, registrations: s.registrations.filter((r) => r.id !== id) })),

    checkIn: (eventId) => {
      const uid = currentMember?.id ?? currentOpen?.id;
      if (!uid) return null;
      const reg = state.registrations.find((r) => r.eventId === eventId && r.userId === uid);
      if (!reg || reg.checkedInAt) return reg ?? null;
      const at = new Date().toISOString();
      let updatedReg = reg;
      mutate((s) => {
        const registrations = s.registrations.map((r) =>
          r.id === reg.id ? { ...r, checkedInAt: at } : r,
        );
        updatedReg = registrations.find((r) => r.id === reg.id)!;
        let members = s.members;
        if (currentMember) {
          members = s.members.map((m) => {
            if (m.id !== currentMember.id) return m;
            const races = m.races + 1;
            return { ...m, races, tier: tierFor(races) };
          });
        }
        return { ...s, registrations, members };
      });
      return updatedReg;
    },

    attendeesFor: (eventId) => state.registrations.filter((r) => r.eventId === eventId),

    myRegistrationFor: (eventId) => {
      const uid = currentMember?.id ?? currentOpen?.id;
      if (!uid) return undefined;
      return state.registrations.find((r) => r.eventId === eventId && r.userId === uid);
    },

    setEvents: (events) => mutate((s) => ({ ...s, events })),

    redeem: (rewardId) => {
      if (!currentMember) return;
      mutate((s) => ({
        ...s,
        redemptions: [
          ...s.redemptions,
          {
            id: `rd-${Date.now()}`,
            rewardId,
            memberId: currentMember.id,
            at: new Date().toISOString(),
          },
        ],
      }));
    },

    myRedemptions: () =>
      currentMember ? state.redemptions.filter((r) => r.memberId === currentMember.id) : [],

    createEvent: (e) =>
      mutate((s) => ({
        ...s,
        events: [...s.events, { ...e, id: `evt-${Date.now()}`, attendees: [] }],
      })),
    updateEvent: (id, patch) =>
      mutate((s) => ({
        ...s,
        events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    deleteEvent: (id) =>
      mutate((s) => ({
        ...s,
        events: s.events.filter((e) => e.id !== id),
        registrations: s.registrations.filter((r) => r.eventId !== id),
      })),
    createReward: (r) =>
      mutate((s) => ({ ...s, rewards: [...s.rewards, { ...r, id: `r-${Date.now()}` }] })),
    updateReward: (id, patch) =>
      mutate((s) => ({
        ...s,
        rewards: s.rewards.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
    deleteReward: (id) => mutate((s) => ({ ...s, rewards: s.rewards.filter((r) => r.id !== id) })),
  };

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}
