import { Link, useNavigate } from "react-router-dom";
import { nextTierInfo, useStore } from "@/lib/store";
import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  Gift,
  LogOut,
  Users,
  Shield,
  Plus,
  Download,
  Trash2,
  Pencil,
  X,
  Check,
  ShoppingBag,
  Mail,
  Eye,
  EyeOff,
  Lock,
  ImagePlus,
  Loader2,
  Phone,
  ShieldCheck,
  RefreshCw,
  Bell,
  QrCode,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  subscribeToAdvertisements,
  updateAdvertisement,
  deleteAdvertisement,
  deactivateExpiredAdvertisements,
  isAdvertisementExpired,
  type Advertisement,
} from "@/lib/advertService";
import type { Event, Reward, Tier } from "@/lib/demo-data";
import {
  subscribeToNotifications,
  createNotification,
  hideNotificationForAdmin,
  ADMIN_CLEAR_KEY,
  type Notification,
} from "@/lib/notificationService";
import {
  createEventInFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
  uploadEventImage,
  subscribeToEvents,
} from "@/lib/eventService";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  limit,
  deleteDoc,
  updateDoc,
  addDoc,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ADMIN_EMAIL } from "@/lib/demo-data";
import { formatDistanceKm } from "@/lib/utils";
import { signInAsAdmin } from "@/services/authService";
import {
  subscribeToSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  uploadSponsorLogo,
  type Sponsor,
} from "@/lib/sponsorService";

type Tab = "overview" | "events" | "members" | "rewards" | "orders" | "notifications" | "qrcodes" | "sponsors" | "adverts";
const ADMIN_PASSWORD = "WavenHarper2026";
const ITEMS_PER_PAGE = 25;

const tierMeta: Record<Tier, { color: string }> = {
  Pink: { color: "#e91e8c" },
  Silver: { color: "#9ca3af" },
  Gold: { color: "#f59e0b" },
  Platinum: { color: "#a78bfa" },
};

const tierRank: Record<Tier, number> = { Pink: 0, Silver: 1, Gold: 2, Platinum: 3 };

interface FSMember {
  id: string;
  name: string;
  email: string;
  contact?: string;
  emergency?: string;
  joined: string;
  races: number;
  tier: Tier;
  role: "member";
}

interface FSRegistration {
  id: string;
  eventId: string;
  userId: string | null;
  name: string;
  contact?: string;
  emergency?: string;
  openRunner: boolean;
  tier?: string;
  checkedInAt: string | null;
  createdAt: any;
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="rounded-2xl border border-border bg-card p-8 max-w-md text-center">
            <h1 className="display text-2xl mb-3">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-5">
              {this.state.error?.message || "An error occurred in the admin panel"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-xs font-semibold uppercase text-primary-foreground"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Notifications Admin ──────────────────────────────────────────────────────

function NotificationsAdmin() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    return subscribeToNotifications(setNotifs);
  }, []);

  const visibleNotifs = notifs.filter((n) => !n.deletedBy?.includes(ADMIN_CLEAR_KEY));

  async function handleClearAll() {
    if (
      !confirm("Clear all notifications from this admin view? Users still see their own copies, and this clears on every device you log into as admin.")
    )
      return;
    setClearingAll(true);
    try {
      await Promise.all(visibleNotifs.map((n) => hideNotificationForAdmin(n.id)));
      toast.success("Cleared from admin view.");
    } catch {
      toast.error("Could not clear. Try again.");
    } finally {
      setClearingAll(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await createNotification({ title, body, audience: "all" });
      toast.success("Notification sent.");
      setTitle("");
      setBody("");
    } catch {
      toast.error("Failed to send.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast.success("Deleted.");
    } catch {
      toast.error("Could not delete.");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="display text-lg mb-4">Send notification</div>
        <form onSubmit={handleSend} className="space-y-4">
          <In label="Title" value={title} onChange={setTitle} required />
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Message
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Bell size={14} /> Send
              </>
            )}
          </button>
        </form>
      </div>

      {visibleNotifs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="bg-secondary/50 px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Sent ({visibleNotifs.length})
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 normal-case tracking-normal">
                Users manage and clear their own notifications from their notifications page.
              </p>
            </div>
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive whitespace-nowrap disabled:opacity-40"
            >
              {clearingAll ? "Clearing…" : "Clear all"}
            </button>
          </div>
          <ul className="divide-y divide-border">
            {visibleNotifs.map((n) => (
              <li key={n.id} className="p-4">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {n.audience} · {new Date(n.createdAt).toLocaleDateString("en-ZA")} ·{" "}
                  {n.readBy.length} read
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Hook: subscribe to all registrations (FIXED) ────────────────────────────────

function useRegistrations() {
  const [registrations, setRegistrations] = useState<FSRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

const subscribe = async () => {
  try {
    unsubscribe = onSnapshot(
      query(
        collection(db, "eventRegistrations"),
        orderBy("createdAt", "desc"),
        limit(1000)  // ✅ ADD THIS
      ),
      (snap) => {
            if (!isMounted) return;
            const regs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            regs.sort((a: any, b: any) => {
              const ta = a.createdAt?.toMillis?.() ?? 0;
              const tb = b.createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
            setRegistrations(regs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (!isMounted) return;
            console.error("registrations onSnapshot error:", err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.error("subscription setup error:", err);
        setError("Failed to load registrations");
        setLoading(false);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error("unsubscribe error:", err);
        }
      }
    };
  }, []);

  return { registrations, loading, error };
}

// ── Hook: subscribe to all users (FIXED) ──────────────────────────────────────

function useUsers() {
  const [members, setMembers] = useState<FSMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

const subscribe = async () => {
  try {
    unsubscribe = onSnapshot(
      query(
        collection(db, "users"),
        orderBy("joined", "desc"),
        limit(500)  // ✅ ADD THIS
      ),
      (snap) => {
            if (!isMounted) return;
            const allUsers = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

            const dedup = <T extends { email: string; joined?: string }>(arr: T[]): T[] => {
              const map = new Map<string, T>();
              for (const u of arr) {
                const existing = map.get(u.email);
                if (!existing || (u.joined ?? "") > (existing.joined ?? "")) {
                  map.set(u.email, u);
                }
              }
              return Array.from(map.values());
            };

            setMembers(dedup(allUsers.filter((u: any) => u.role === "member") as FSMember[]));
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (!isMounted) return;
            console.error("users onSnapshot error:", err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        if (!isMounted) return;
        console.error("subscription setup error:", err);
        setError("Failed to load users");
        setLoading(false);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error("unsubscribe error:", err);
        }
      }
    };
  }, []);

  return { members, loading, error };
}

// ── Hook: subscribe to events ─────────────────────────────────────────────────
function useEvents() {
  const { state, setEvents } = useStore();
  useEffect(() => {
    const unsub = subscribeToEvents((events) => setEvents(events));
    return () => unsub();
  }, [setEvents]);
  return state.events;
}

// ── Today's date string (YYYY-MM-DD, local time) ─────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function AdminCore() {
  const { currentUser, loginAdmin, logout } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.title = "Admin · Waven Harper Fitness";
  }, []);

  if (currentUser?.kind !== "admin") {
    return <AdminLogin onLogin={loginAdmin} />;
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "events", label: "Events", icon: Calendar },
    { id: "members", label: "Members", icon: Users },
    { id: "rewards", label: "Rewards", icon: Gift },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "qrcodes", label: "QR Codes", icon: QrCode },
    { id: "sponsors", label: "Sponsors", icon: ImagePlus },
    { id: "adverts", label: "Adverts", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-10">
          <Shield className="text-primary" size={20} />
          <div>
            <div className="display text-sm tracking-[0.2em]">WH · Admin</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Control room
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id as Tab)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                tab === n.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <n.icon size={16} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <LogOut size={14} /> Exit admin
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] flex flex-col border-r border-border bg-card transition-transform duration-200 md:hidden ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <div className="flex items-center justify-between p-5 pb-0 shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={20} />
              <div>
                <div className="display text-sm tracking-[0.2em]">WH · Admin</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Control room
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 p-5 py-6">
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setTab(n.id as Tab);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  tab === n.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <n.icon size={16} /> {n.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0 border-t border-border bg-card/95 p-4">
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <LogOut size={14} /> Exit admin
            </button>
          </div>
        </div>

        <header
          className="flex items-center justify-between border-b border-border px-4 sm:px-6 md:px-10 py-4 md:py-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground p-2 rounded-md active:scale-95 touch-manipulation"
              aria-label="Open navigation"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Admin</div>
              <h1 className="display text-3xl capitalize">{tab}</h1>
            </div>
          </div>
        </header>
<div className="p-4 sm:p-6 md:p-10 max-h-[calc(100vh-140px)] overflow-y-auto">
          {tab === "overview" && <Overview />}
          {tab === "events" && <EventsAdmin />}
          {tab === "members" && <MembersAdmin />}
          {tab === "rewards" && <RewardsAdmin />}
          {tab === "orders" && <OrdersAdmin />}
          {tab === "notifications" && <NotificationsAdmin />}
          {tab === "qrcodes" && <QRCodesAdmin />}
          {tab === "sponsors" && <SponsorsAdmin />}
          {tab === "adverts" && <AdvertsAdmin />}
        </div>
      </main>
    </div>
  );
}

export default function Admin() {
  return (
    <ErrorBoundary>
      <AdminCore />
    </ErrorBoundary>
  );
}

// ─── Password Login ───────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void | Promise<void> }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      try {
        await signInAsAdmin();
        await onLogin();
        toast.success("Welcome back, admin.");
      } catch (err) {
        console.error("Admin authentication failed:", err);
        const code = (err as { code?: string })?.code;
        setError(code ? `Firebase login failed (${code}).` : "Could not connect to Firebase.");
      }
    } else {
      setError("Incorrect password. Try again.");
      setShaking(true);
      setPassword("");
      setTimeout(() => setShaking(false), 500);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div
        className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center"
        style={shaking ? { animation: "shake 0.4s ease" } : {}}
      >
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
          }
        `}</style>
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Lock className="text-primary" size={20} />
        </div>
        <h1 className="display text-3xl">Admin control room</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For organisers only. Enter your password to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Password"
              autoFocus
              className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm bg-background outline-none transition ${
                error ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && <p className="text-xs text-destructive pl-1">{error}</p>}
          <button
            type="submit"
            disabled={!password}
            className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enter admin
          </button>
        </form>
        <Link
          to="/"
          className="mt-4 inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

// ─── Adverts Admin ───────────────────────────────────────────────────────────

function AdvertsAdmin() {
  const [rows, setRows] = useState<Advertisement[]>([]);

  useEffect(() => {
    const unsub = subscribeToAdvertisements(setRows);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (rows.length > 0) {
      void deactivateExpiredAdvertisements(rows);
    }
  }, [rows]);

  async function approve(ad: Advertisement) {
    if (isAdvertisementExpired(ad)) {
      toast.error("This advert has expired. Update its activation period first.");
      return;
    }
    await updateAdvertisement(ad.id, { status: "approved", enabled: true });
  }

  async function reject(ad: Advertisement) {
    await updateAdvertisement(ad.id, { status: "rejected", enabled: false });
  }

  async function toggleEnabled(ad: Advertisement) {
    if (!ad.enabled && isAdvertisementExpired(ad)) {
      toast.error("This advert has expired. Update its activation period first.");
      return;
    }
    await updateAdvertisement(ad.id, { enabled: !ad.enabled });
  }

  async function remove(ad: Advertisement) {
    if (!confirm(`Delete advert for ${ad.businessName}?`)) return;
    await deleteAdvertisement(ad.id);
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <Panel title="Adverts">
          <p className="text-sm text-muted-foreground">No advertising applications yet.</p>
        </Panel>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Business</th>
                  <th className="p-4 text-left">Contact</th>
                  <th className="p-4 text-left">Website</th>
                  <th className="p-4 text-left">Order</th>
                  <th className="p-4 text-left">Format</th>
                  <th className="p-4 text-left">Period</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((ad) => (
                  <tr key={ad.id} className="hover:bg-secondary/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background flex items-center justify-center">
                          {(ad.imageUrl || ad.logoUrl) ? (
                            <img
                              src={ad.imageUrl || ad.logoUrl}
                              alt={ad.businessName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Megaphone size={18} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{ad.businessName}</div>
                          <div className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground">
                            {ad.slogan}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      <div>{ad.contactName}</div>
                      <div>{ad.contactEmail}</div>
                      <div>{ad.contactPhone}</div>
                    </td>
                    <td className="p-4 max-w-[220px] truncate text-xs text-muted-foreground">
                      {ad.websiteUrl}
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                      <div>{ad.orderNumber}</div>
                      <div className="mt-1">R{ad.price}/month</div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="capitalize">{ad.adType ?? "logo"}</div>
                      <div className="mt-1">{ad.dimensions ?? "Logo"}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                      <div>From {ad.activationDate ?? "-"}</div>
                      <div className="mt-1">Until {ad.expiryDate ?? "-"}</div>
                      <div className="mt-1">{ad.months ?? "-"} month(s)</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className={`text-xs uppercase tracking-[0.2em] ${isAdvertisementExpired(ad) ? "text-destructive" : "text-primary"}`}>
                        {isAdvertisementExpired(ad) ? "expired" : ad.status}
                      </div>
                      {ad.status === "approved" && (
                        <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                          {ad.enabled ? "Enabled" : "Disabled"}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {ad.status !== "approved" && (
                          <button
                            onClick={() => approve(ad)}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400"
                          >
                            Accept
                          </button>
                        )}
                        {ad.status === "approved" && (
                          <button
                            onClick={() => toggleEnabled(ad)}
                            className="rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary"
                          >
                            {ad.enabled ? "Disable" : "Enable"}
                          </button>
                        )}
                        <button
                          onClick={() => reject(ad)}
                          className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => remove(ad)}
                          className="rounded-full border border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className="mt-2 display text-4xl">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="display text-lg">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function In({
  label,
  value,
  onChange,
  type = "text",
  required,
  min,
  max,
  inputMode,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
}) {
  const isDate = type === "date";
  const isTime = type === "time";

  function handleDateChange(raw: string) {
    if (!raw) {
      onChange("");
      return;
    }
    if (raw.length === 10) {
      const d = new Date(raw + "T12:00:00");
      if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return;
    }
    onChange(raw);
  }

  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </span>
      <input
        type={isDate ? "date" : type}
        value={value}
        onChange={(e) => (isDate ? handleDateChange(e.target.value) : onChange(e.target.value))}
        required={required}
        min={min ?? (isDate ? "2020-01-01" : undefined)}
        max={max ?? (isDate ? "2099-12-31" : undefined)}
        inputMode={inputMode}
        pattern={pattern}
        className={`mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary
  ${
    isDate || type === "time"
      ? "[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200"
      : ""
  }`}
      />
    </label>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="p-4">
              <div className="h-3 rounded bg-secondary/60 animate-pulse w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Pagination Component ─────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-md border border-border hover:border-primary disabled:opacity-40 transition"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-md border border-border hover:border-primary disabled:opacity-40 transition"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview() {
  const allEvents = useEvents();
  const { registrations, loading: regLoading } = useRegistrations();
  const { members, loading: usersLoading } = useUsers();
  const [pendingOrders, setPendingOrders] = useState(0);
  
  useEffect(() => {
    let isMounted = true;
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      if (isMounted) {
        setPendingOrders(snap.docs.filter((d) => !d.data().batched).length);
      }
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const [pendingAdverts, setPendingAdverts] = useState(0);
  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToAdvertisements((rows) => {
      if (isMounted) {
        setPendingAdverts(rows.filter((a) => a.status === "pending").length);
      }
    });
    return () => {
      isMounted = false;
      unsub?.();
    };
  }, []);

  const today = todayStr();
  const upcomingEvents = allEvents.filter((e) => e.date >= today);

  const recentUsers = [...members]
    .sort((a, b) => new Date(b.joined ?? 0).getTime() - new Date(a.joined ?? 0).getTime())
    .slice(0, 6);
  
  const tierCounts = (["Pink", "Silver", "Gold", "Platinum"] as Tier[]).reduce<
    Record<Tier, number>
  >(
    (acc, t) => {
      acc[t] = members.filter((m) => m.tier === t).length;
      return acc;
    },
    { Pink: 0, Silver: 0, Gold: 0, Platinum: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Stat label="Members" value={usersLoading ? "…" : members.length} />
        <Stat label="Upcoming events" value={upcomingEvents.length} />
      </div>

      {pendingOrders > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-primary" size={20} />
            <div>
              <div className="font-semibold">
                {pendingOrders} pending merch order{pendingOrders !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {pendingOrders >= 10
                  ? "Batch ready to send!"
                  : `${10 - pendingOrders} more until email batch`}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingAdverts > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
          <Megaphone className="text-primary" size={20} />
          <div className="font-semibold">
            {pendingAdverts} advertising application{pendingAdverts !== 1 ? "s" : ""} awaiting review
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent sign-ups">
          {usersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sign-ups yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    {u.name} <span className="text-muted-foreground text-xs">{u.email}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-primary">
                    {(u as FSMember).tier ?? "Member"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tier distribution">
          {usersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {(["Pink", "Silver", "Gold", "Platinum"] as Tier[]).map((t) => {
                const count = tierCounts[t];
                const pct = members.length ? (count / members.length) * 100 : 0;
                return (
                  <div key={t}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: tierMeta[t].color }}>{t}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: tierMeta[t].color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── Events Admin ─────────────────────────────────────────────────────────────

function EventsAdmin() {
  const { state, createEvent, updateEvent, deleteEvent } = useStore();
  const allEvents = useEvents();
  const { registrations } = useRegistrations();
  const [editing, setEditing] = useState<Event | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const blank: Omit<Event, "id" | "attendees"> = {
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "06:00",
    meetingPlace: "",
    afterRunPlace: "",
    description: "",
    image: "",
    membersOnly: false,
    distanceKm: 0,
  };

  const activeEventIds = new Set(allEvents.map((e) => e.id));

  useEffect(() => {
    if (selectedEventId && !activeEventIds.has(selectedEventId)) {
      setSelectedEventId("");
    }
  }, [selectedEventId, activeEventIds]);

  function exportExcel() {
    const rows = selectedEventId
      ? (() => {
          const selectedEvent = allEvents.find((e) => e.id === selectedEventId);
          if (!selectedEvent) return [];
          return registrations
            .filter((r) => r.eventId === selectedEventId)
            .map((r) => ({
              Event: selectedEvent.title,
              Date: selectedEvent.date,
              Attendee: r.name,
              Contact: r.contact ?? "",
              Emergency: r.emergency ?? "",
              Type: r.openRunner ? "Open" : (r.tier ?? "Member"),
              "Checked In": r.checkedInAt ? "Yes" : "No",
            }));
        })()
      : registrations
          .filter((r) => activeEventIds.has(r.eventId))
          .map((r) => {
            const event = allEvents.find((x) => x.id === r.eventId);
            return {
              Event: event?.title ?? r.eventId,
              Date: event?.date ?? "",
              Attendee: r.name,
              Contact: r.contact ?? "",
              Emergency: r.emergency ?? "",
              Type: r.openRunner ? "Open" : (r.tier ?? "Member"),
              "Checked In": r.checkedInAt ? "Yes" : "No",
            };
          });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = selectedEventId
      ? allEvents.find((e) => e.id === selectedEventId)?.title || "event-signups"
      : "event-signups";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.replace(/\s+/g, "-").toLowerCase()}-signups.xlsx`);
  }

  const today = todayStr();
  const upcoming = allEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = allEvents
    .filter((e) => e.date < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayed = showPast ? [...upcoming, ...past] : upcoming;

  async function handleSave(data: Omit<Event, "id" | "attendees">) {
    setSaving(true);
    try {
      if (editing) {
        await updateEventInFirestore(editing.id, data);
        updateEvent(editing.id, data);
        toast.success("Event updated.");
      } else {
        const id = await createEventInFirestore(data);
        createEvent({ ...data, id } as any);
        toast.success("Event created — live on site now.");

        try {
          await createNotification({
            title: "New event added",
            body: `${data.title} — ${new Date(data.date + "T12:00:00").toDateString()}`,
            audience: data.membersOnly ? "members" : "all",
            link: "/events",
          });
        } catch (notifErr) {
          console.error("Failed to send notification:", notifErr);
        }
      }
    } catch (err) {
      console.error("Failed to save event:", err);
      const code = (err as { code?: string })?.code;
      toast.error(code ? `Failed to save event (${code}).` : "Failed to save event. Try again.");
    } finally {
      setSaving(false);
      setEditing(null);
      setCreating(false);
    }
  }

  async function handleDelete(e: Event) {
    const confirmed = window.confirm(
      `Delete "${e.title}"?\n\nAll attendee sign-ups and check-ins for this event will remain in the database but the event will be removed from the site. This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteEventFromFirestore(e.id);
      deleteEvent(e.id);
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <button
          onClick={() => setShowPast((v) => !v)}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors text-left"
        >
          {showPast ? "Hide past events" : `Show past events (${past.length})`}
        </button>

{/* ✅ ADD THIS ENTIRE SECTION BELOW: */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Export:
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="">All events</option>
          {allEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({new Date(e.date + "T12:00:00").toDateString()})
            </option>
          ))}
        </select>
      </div>

        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary active:scale-95 transition-all whitespace-nowrap"
          >
            <Download size={13} /> Export Excel
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground active:scale-95 transition-transform whitespace-nowrap"
          >
            <Plus size={13} /> New event
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Calendar className="mx-auto text-muted-foreground mb-3" size={28} />
          <p className="text-sm text-muted-foreground">
            No upcoming events. Create your first one.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Event</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Time</th>
                  <th className="text-left p-4">Distance</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Attendees</th>
                  <th className="p-4 text-right">
                    <span className="text-[9px] normal-case tracking-normal text-muted-foreground/60 font-normal">
                      ↓ tap row to view attendees
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((e) => {
                  const isPast = e.date < today;
                  const eventRegs = registrations.filter((r) => r.eventId === e.id);
                  const count = eventRegs.length;
                  const checkedInCount = eventRegs.filter((r) => r.checkedInAt).length;
                  return (
                    <EventRow
                      key={e.id}
                      e={e}
                      isPast={isPast}
                      eventRegs={eventRegs}
                      count={count}
                      checkedInCount={checkedInCount}
                      onEdit={() => setEditing(e)}
                      onDelete={() => handleDelete(e)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <EventModal
          initial={editing ?? blank}
          title={editing ? "Edit event" : "New event"}
          saving={saving}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── Event Row (with expandable sign-ups) ────────────────────────────────────

function EventRow({
  e,
  isPast,
  eventRegs,
  count,
  checkedInCount,
  onEdit,
  onDelete,
}: {
  e: Event;
  isPast: boolean;
  eventRegs: FSRegistration[];
  count: number;
  checkedInCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [search, setSearch] = useState("");

const filteredRegs = search.trim()
    ? eventRegs.filter((r) => {
        const q = search.trim().toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.contact?.toLowerCase().includes(q) ||
          r.emergency?.toLowerCase().includes(q)
        );
      })
    : eventRegs;

  async function handleManualCheckIn(regId: string, attendeeName: string) {
    const confirmed = window.confirm(`Check in ${attendeeName} for ${e.title}?`);
    if (!confirmed) return;

    setCheckingIn(regId);
    try {
      await updateDoc(doc(db, "eventRegistrations", regId), {
        checkedInAt: new Date().toISOString(),
      });
      toast.success("Checked in.");
    } catch (err) {
      console.error("Manual check-in failed:", err);
      toast.error("Could not check in. Try again.");
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <>
      <tr
        className={`hover:bg-secondary/30 cursor-pointer ${isPast ? "opacity-50" : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="p-4 font-medium">
          <div className="flex items-center gap-3">
{e.image && (
  <img 
    src={e.image} 
    alt="" 
    className="w-10 h-10 rounded-lg object-cover shrink-0"
    loading="lazy"
    decoding="async"
  />
)}
            <span>
              {e.title}
              {isPast && (
                <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Past
                </span>
              )}
            </span>
          </div>
        </td>
        <td className="p-4 text-muted-foreground">
          {new Date(e.date + "T12:00:00").toDateString()}
        </td>
        <td className="p-4 text-muted-foreground">{e.time}</td>
        <td className="p-4 text-muted-foreground">{formatDistanceKm(e.distanceKm)} km</td>
        <td className="p-4">
          {e.membersOnly ? (
            <span className="text-primary text-[10px] uppercase tracking-widest font-semibold">
              Members
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Open
            </span>
          )}
        </td>
        <td className="p-4">
          <span>{count}</span>
          {checkedInCount > 0 && (
            <span className="ml-1.5 text-[10px] text-primary uppercase tracking-widest">
              ({checkedInCount} in)
            </span>
          )}
        </td>
        <td className="p-4 text-right" onClick={(ev) => ev.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <button
              onClick={onEdit}
              className="rounded-md border border-border p-2 hover:border-primary transition active:scale-90"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="rounded-md border border-border p-2 hover:border-destructive hover:text-destructive transition active:scale-90"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-secondary/20">
          <td colSpan={7} className="px-6 py-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Sign-ups ({search.trim() ? `${filteredRegs.length} of ${count}` : count})
              </div>
              {count > 0 && (
                <div
                  className="relative w-full sm:w-56"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <input
                    type="text"
                    value={search}
                    onChange={(ev) => setSearch(ev.target.value)}
                    placeholder="Search sign-ups…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pr-7 text-xs outline-none focus:border-primary"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {count === 0 ? (
              <p className="text-xs text-muted-foreground">No one signed up yet.</p>
            ) : filteredRegs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sign-ups match "{search}".</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="text-left pb-2 pr-6">Name</th>
                      <th className="text-left pb-2 pr-6">Contact</th>
                      <th className="text-left pb-2 pr-6">Emergency contact</th>
                      <th className="text-left pb-2 pr-6">Type</th>
                      <th className="text-left pb-2">Checked in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredRegs.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-6 font-medium">{r.name}</td>
                        <td className="py-2 pr-6 text-muted-foreground">{r.contact || "—"}</td>
                        <td className="py-2 pr-6 text-muted-foreground">{r.emergency || "—"}</td>
                        <td className="py-2 pr-6">
                          <span
                            className={`text-[10px] uppercase tracking-widest ${r.openRunner ? "text-muted-foreground" : "text-primary"}`}
                          >
                            {r.openRunner ? "Open" : (r.tier ?? "Member")}
                          </span>
                        </td>
                        <td className="py-2">
                          {r.checkedInAt ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
                              <Check size={10} />{" "}
                              {new Date(r.checkedInAt).toLocaleTimeString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(r.id, r.name)}
                              disabled={checkingIn === r.id}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition active:scale-90 disabled:opacity-40"
                            >
                              {checkingIn === r.id ? (
                                <Loader2 size={9} className="animate-spin" />
                              ) : (
                                <Check size={9} />
                              )}
                              Check in
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Event Modal ──────────────────────────────────────────────────────────────

function EventModal({
  initial,
  title,
  saving,
  onClose,
  onSave,
}: {
  initial: Omit<Event, "id" | "attendees"> | Event;
  title: string;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Omit<Event, "id" | "attendees">) => void;
}) {
  const [f, setF] = useState({
    ...initial,
    imageOrientation:
      (initial as any).imageOrientation ?? ("landscape" as "landscape" | "portrait"),
    distanceDisplay:
      (initial as any).distanceDisplay ??
      (initial.distanceKm ? formatDistanceKm(initial.distanceKm) : ""),
  });
  const [distanceInput, setDistanceInput] = useState(
    () => (initial as any).distanceDisplay ?? (initial.distanceKm ? formatDistanceKm(initial.distanceKm) : ""),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const acceptedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    if (!file.type.startsWith("image/") && !acceptedTypes.includes(file.type.toLowerCase())) {
      toast.error("Please select an image file (JPG, PNG, WEBP, etc).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20 MB.");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadEventImage(file, setUploadPct);
      setF((prev) => ({ ...prev, image: url }));
      toast.success("Image uploaded.");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Upload failed. Please try a different image or paste a URL instead.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ✅ ADD THIS CLEANUP
useEffect(() => {
  return () => {
    // Cleanup when modal closes
    setUploading(false);
    setUploadPct(0);
  };
}, []);

  const busy = uploading || saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="display text-2xl mb-5">{title}</div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            onSave(f as Omit<Event, "id" | "attendees">);
          }}
          className="space-y-4"
        >
          <In
            label="Event title"
            value={f.title}
            onChange={(v) => setF({ ...f, title: v })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <In
              label="Date"
              type="date"
              value={f.date}
              onChange={(v) => setF({ ...f, date: v })}
              required
              min="2020-01-01"
              max="2099-12-31"
            />
            <In
              label="Time"
              type="time"
              value={f.time}
              onChange={(v) => setF({ ...f, time: v })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<In
  label="Distance (km)"
  type="text"
  value={distanceInput}
  onChange={(v) => {
    setDistanceInput(v);
    setF((prev) => ({
      ...prev,
      distanceKm: v,
      distanceDisplay: v,
    }));
  }}
/>
          </div>

          <In
            label="Meeting place"
            value={f.meetingPlace}
            onChange={(v) => setF({ ...f, meetingPlace: v })}
            required
          />
          <In
            label="After-event venue"
            value={f.afterRunPlace}
            onChange={(v) => setF({ ...f, afterRunPlace: v })}
          />

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Description
            </span>
            <textarea
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
              rows={3}
            />
          </label>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Cover image
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 self-start">
                {(["landscape", "portrait"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setF({ ...f, imageOrientation: o })}
                    className={`rounded-md px-3 py-1 text-[10px] uppercase tracking-widest transition ${
                      f.imageOrientation === o
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o === "landscape" ? "🖼 Landscape" : "🖼 Portrait"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary disabled:opacity-40 active:scale-95 transition-all"
              >
                <ImagePlus size={13} />
                {uploading ? `Uploading ${uploadPct}%…` : "Upload image"}
              </button>
              {f.image && !uploading && (
                <>
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
                    <Check size={12} /> Uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => setF({ ...f, image: "" })}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {uploading && (
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            )}

            {f.image && !uploading && (
              <div
                className="rounded-xl overflow-hidden bg-secondary border border-border"
                style={{ height: f.imageOrientation === "portrait" ? "280px" : "144px" }}
              >
                <img
                  src={f.image}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {!f.image && !uploading && (
              <In
                label="Or paste image URL"
                value={f.image}
                onChange={(v) => setF({ ...f, image: v })}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={14} /> Save event
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Members Admin (with pagination) ───────────────────────────────────────

function MembersAdmin() {
  const { members, loading } = useUsers();
  const { registrations, loading: regLoading } = useRegistrations();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const allEvents = useEvents();

  async function handleTierChange(memberId: string, newTier: Tier) {
    setUpdatingTier(memberId);
    try {
      await updateDoc(doc(db, "users", memberId), { tier: newTier });
      toast.success("Tier updated.");
    } catch {
      toast.error("Could not update tier.");
    } finally {
      setUpdatingTier(null);
    }
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the database? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success(`${name} removed.`);
    } catch {
      toast.error("Could not remove user.");
    }
  }

  function raceCount(userId: string) {
    return registrations.filter((r) => r.userId === userId && r.checkedInAt).length;
  }

  const sortedMembers = members
    .map((member) => ({ ...member, checkInCount: raceCount(member.id) }))
    .sort((a, b) => b.checkInCount - a.checkInCount || a.name.localeCompare(b.name));

  function exportMembersExcel() {
    const memberRows = sortedMembers.map((m) => ({
      Name: m.name,
      Email: m.email,
      Contact: m.contact ?? "",
      Emergency: m.emergency ?? "",
      Joined: m.joined?.slice(0, 10) ?? "",
      "Events Attended": m.checkInCount,
      Tier: m.tier,
      Role: "Member",
      "Waiver Accepted": (m as any).waiverAccepted ? "Yes" : "No",
      "Waiver Date": (m as any).waiverAcceptedAt?.slice(0, 10) ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet([...memberRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "members.xlsx");
  }

  const totalPages = Math.ceil(sortedMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = sortedMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="bg-secondary/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Club Members ({loading ? "…" : members.length}) · Check-ins highest first
          </div>
          <button
            onClick={exportMembersExcel}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary active:scale-95 transition-all whitespace-nowrap"
          >
            <Download size={13} /> Export Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-secondary/30 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Contact</th>
                <th className="text-left p-4">Emergency</th>
                <th className="text-left p-4">Joined</th>
                <th className="text-left p-4">Check-ins / next tier</th>
                <th className="text-left p-4">Waiver</th>
                <th className="text-left p-4">Tier</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRows cols={9} />
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                    No members yet.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const goal = nextTierInfo(m.checkInCount);
                  return (
                  <React.Fragment key={m.id}>
                    <tr
                      className="hover:bg-secondary/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    >
                      <td className="p-4 font-medium">{m.name}</td>
                      <td className="p-4 text-muted-foreground">{m.email}</td>
                      <td className="p-4 text-muted-foreground">{m.contact || "—"}</td>
                      <td className="p-4 text-muted-foreground max-w-[180px] truncate">
                        {m.emergency || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">{m.joined?.slice(0, 10) ?? "—"}</td>
                      <td className="p-4">
                        {regLoading ? (
                          "…"
                        ) : (
                          <div className="min-w-[125px]">
                            <div className="font-medium">{m.checkInCount}</div>
                            {goal.needed > 0 ? (
                              <>
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  {goal.needed} to {goal.next}
                                </div>
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.min(100, (m.checkInCount / goal.target) * 100)}%` }}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="mt-1 text-[10px] text-primary">Top tier reached</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {(m as any).waiverAccepted ? (
                          <span className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
                              <Check size={10} /> Signed
                            </span>
                            {(m as any).waiverAcceptedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date((m as any).waiverAcceptedAt).toLocaleDateString("en-ZA")}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={m.tier}
                            onChange={(e) => handleTierChange(m.id, e.target.value as Tier)}
                            disabled={updatingTier === m.id}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                            style={{ color: tierMeta[m.tier]?.color }}
                          >
                            {(["Pink", "Silver", "Gold", "Platinum"] as Tier[]).map((t) => (
                              <option key={t} value={t} style={{ color: tierMeta[t].color }}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {updatingTier === m.id && (
                            <Loader2 size={12} className="animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteUser(m.id, m.name)}
                          className="rounded-md border border-border p-2 hover:border-destructive hover:text-destructive transition active:scale-90"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === m.id && (
                      <tr key={`${m.id}-exp`} className="bg-secondary/20">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                            Event registrations
                          </div>
                          {registrations.filter((r) => r.userId === m.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No registrations yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {registrations
                                .filter((r) => r.userId === m.id)
                                .map((r) => {
                                  const evt = allEvents.find((e) => e.id === r.eventId);
                                  return (
                                    <span
                                      key={r.id}
                                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest border ${
                                        r.checkedInAt
                                          ? "border-primary/40 bg-primary/10 text-primary"
                                          : "border-border text-muted-foreground"
                                      }`}
                                    >
                                      {r.checkedInAt ? <Check size={10} /> : null}
                                      {evt?.title ?? r.eventId}
                                    </span>
                                  );
                                })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}

// ─── Rewards Admin ────────────────────────────────────────────────────────────

const REWARD_TIERS: Array<Tier> = ["Pink", "Silver", "Gold", "Platinum"];

function RewardsAdmin() {
  const { createReward, updateReward, deleteReward } = useStore();
  const [firestoreRewards, setFirestoreRewards] = useState<Reward[]>([]);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsub = onSnapshot(collection(db, "rewards"), (snap) => {
      if (isMounted) {
        setFirestoreRewards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Reward[]);
      }
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const blank: Omit<Reward, "id"> = { tier: "Pink", title: "", description: "", expiresInDays: 30 };
  const grouped = REWARD_TIERS.reduce<Record<string, Reward[]>>((acc, t) => {
    acc[t] = firestoreRewards.filter((r) => r.tier === t);
    return acc;
  }, {});

  function isExpired(r: Reward): boolean {
    if (!(r as any).createdAt) return false;
    const created = new Date((r as any).createdAt).getTime();
    const expiry = created + r.expiresInDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiry;
  }

  function daysLeftFor(r: Reward): number | null {
    if (!(r as any).createdAt) return null;
    const created = new Date((r as any).createdAt).getTime();
    const expiry = created + r.expiresInDays * 24 * 60 * 60 * 1000;
    const msLeft = expiry - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }

  async function handleSave(data: Omit<Reward, "id">) {
    if (editing) {
      try {
        await updateDoc(doc(db, "rewards", editing.id), data as any);
        toast.success("Reward updated.");
      } catch {
        toast.error("Could not update reward.");
      }
    } else {
      try {
        await addDoc(collection(db, "rewards"), { ...data, createdAt: new Date().toISOString() });
        toast.success("Reward created.");
        if (data.tier !== "Special") {
          try {
            await createNotification({
              title: `New ${data.tier} reward unlocked`,
              body: data.title,
              audience: "members",
              minTier: data.tier as any,
              link: "/membership",
            });
          } catch {
            // non-blocking
          }
        }
      } catch {
        toast.error("Could not create reward.");
      }
    }
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(r: Reward) {
    const confirmed = window.confirm(
      `Delete "${r.title}"?\n\nMembers who have this reward will lose it immediately and won't be able to redeem it. This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "rewards", r.id));
      toast.success("Reward deleted.");
    } catch {
      toast.error("Could not delete reward.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus size={13} /> New reward
        </button>
      </div>

      {firestoreRewards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Gift className="mx-auto text-muted-foreground mb-3" size={28} />
          <p className="text-sm text-muted-foreground">
            No rewards yet. Add perks for your members.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {REWARD_TIERS.map((tier) => {
            const rewards = grouped[tier];
            if (!rewards || rewards.length === 0) return null;
            return (
              <div key={tier}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="text-xs font-semibold uppercase tracking-[0.25em]"
                    style={{ color: tierMeta[tier as Tier]?.color }}
                  >
                    {tier}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <div className="text-[10px] text-muted-foreground">
                    {rewards.length} reward{rewards.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rewards.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-border bg-card p-5 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="display text-lg leading-tight flex items-center gap-2">
                            {r.title}
                            {isExpired(r) && (
                              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-destructive">
                                Expired
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                            {r.description}
                          </p>
                          <div
                            className={`mt-3 text-[10px] uppercase tracking-widest ${
                              isExpired(r)
                                ? "text-muted-foreground"
                                : daysLeftFor(r) !== null && daysLeftFor(r)! <= 5
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {isExpired(r)
                              ? "Redemption window closed"
                              : daysLeftFor(r) !== null
                                ? `${daysLeftFor(r)} day${daysLeftFor(r) !== 1 ? "s" : ""} left to redeem`
                                : `Redeem within ${r.expiresInDays} day${r.expiresInDays !== 1 ? "s" : ""}`}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => setEditing(r)}
                            className="rounded-md border border-border p-2 hover:border-primary transition active:scale-90"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="rounded-md border border-border p-2 hover:border-destructive hover:text-destructive transition active:scale-90"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <RewardModal
          initial={editing ?? blank}
          title={editing ? "Edit reward" : "New reward"}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function RewardModal({
  initial,
  title,
  onClose,
  onSave,
}: {
  initial: Omit<Reward, "id"> | Reward;
  title: string;
  onClose: () => void;
  onSave: (data: Omit<Reward, "id">) => void;
}) {
  const [f, setF] = useState({ ...initial });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="display text-2xl mb-5">{title}</div>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            onSave(f as Omit<Reward, "id">);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Tier <span className="text-primary">*</span>
            </span>
            <select
              value={f.tier}
              onChange={(e) => setF({ ...f, tier: e.target.value as any })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {REWARD_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <In
            label="Reward title"
            value={f.title}
            onChange={(v) => setF({ ...f, title: v })}
            required
          />
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Description <span className="text-primary">*</span>
            </span>
            <textarea
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
              rows={3}
            />
          </label>
          <In
            label="Expires in (days)"
            type="number"
            value={String(f.expiresInDays)}
            onChange={(v) => setF({ ...f, expiresInDays: Math.max(1, Number(v)) })}
            required
          />
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Check size={14} /> Save reward
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Orders Admin ─────────────────────────────────────────────────────────────

const ORDER_BATCH_SIZE = 10;

function OrdersAdmin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingBatch, setSendingBatch] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsub = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        if (!isMounted) return;
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setOrders(rows);
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error("orders onSnapshot error:", err);
        setLoading(false);
      },
    );
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const unbatched = orders.filter((o) => !o.batched);
  const batchedOrders = orders.filter((o) => o.batched);

  async function sendBatchNow() {
    if (unbatched.length === 0) return;
    setSendingBatch(true);
    try {
      const orderDetails = unbatched
        .map((o, i) => {
          const dateStr = o.createdAt?.toDate?.().toISOString().slice(0, 10) ?? "—";
          const itemsStr = o.lines
            .map((l: any) => `${l.qty}x ${l.product} (${l.colour}, ${l.size})`)
            .join(", ");
          return `ORDER ${i + 1} — ${dateStr}\nName: ${o.name}\nEmail: ${o.email}\nPhone: ${o.phone}\nItems: ${itemsStr}\nNotes: ${o.notes || "—"}`;
        })
        .join("\n\n---\n\n");

      await addDoc(collection(db, "mail"), {
        to: [ADMIN_EMAIL],
        message: {
          subject: `LFR order batch summary (${unbatched.length} orders) — manually sent`,
          text: orderDetails,
        },
      });

      const batch = writeBatch(db);
      unbatched.forEach((o) => {
        batch.update(doc(db, "orders", o.id), { batched: true });
      });
      await batch.commit();

      toast.success(`Batch of ${unbatched.length} orders sent to admin.`);
    } catch (err) {
      console.error("Manual batch send failed:", err);
      toast.error("Failed to send batch. Please try again.");
    } finally {
      setSendingBatch(false);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all order history? This cannot be undone.")) return;
    try {
      await Promise.all(orders.map((o) => deleteDoc(doc(db, "orders", o.id))));
      toast.success("Order history cleared.");
    } catch {
      toast.error("Could not clear orders.");
    }
  }

  async function handleDeleteOrder(orderId: string, orderNumber: string, name: string) {
    if (
      !confirm(
        `Delete order ${orderNumber || "—"} from ${name}?\n\nUse this if payment was never received. This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "orders", orderId));
      toast.success(`Order ${orderNumber || ""} deleted.`);
    } catch {
      toast.error("Could not delete order.");
    }
  }

  function exportOrdersExcel() {
    const rows = orders.map((o) => ({
      Date: o.createdAt?.toDate?.().toISOString().slice(0, 10) ?? "",
      Name: o.name,
      Email: o.email,
      Phone: o.phone,
      Items: o.lines.map((l: any) => `${l.qty}x ${l.product} (${l.colour}, ${l.size})`).join("; "),
      Notes: o.notes || "",
      Status: o.batched ? "Batched" : "Pending",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "merch-orders.xlsx");
  }

  function OrderTable({ rows, dimmed }: { rows: any[]; dimmed?: boolean }) {
    return (
      <div
        className={`rounded-2xl border border-border bg-card overflow-hidden ${dimmed ? "opacity-60" : ""}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-4">Order #</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4">Items</th>
                <th className="text-left p-4">Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/30">
                  <td className="p-4 font-mono text-xs text-primary whitespace-nowrap">
                    {o.orderNumber ?? "—"}
                  </td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {o.createdAt?.toDate?.().toISOString().slice(0, 10) ?? "—"}
                  </td>
                  <td className="p-4 font-medium whitespace-nowrap">{o.name}</td>
                  <td className="p-4 text-muted-foreground">{o.email}</td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">{o.phone}</td>
                  <td className="p-4 text-muted-foreground">
                    {o.lines.map((l: any, i: number) => (
                      <span key={i} className="block">
                        {l.qty}× {l.product} — {l.colour}, {l.size}
                      </span>
                    ))}
                  </td>
                  <td className="p-4 text-muted-foreground italic">{o.notes || "—"}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteOrder(o.id, o.orderNumber, o.name)}
                      className="rounded-md border border-border p-2 hover:border-destructive hover:text-destructive transition active:scale-90"
                      aria-label="Delete order"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="display text-lg">
                Pending orders ({loading ? "…" : unbatched.length})
              </div>
              <button
                onClick={exportOrdersExcel}
                disabled={orders.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary active:scale-95 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                <Download size={13} /> Export Excel
              </button>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              An email is sent automatically for every new order, and again automatically once
              pending orders reach {ORDER_BATCH_SIZE}. You can also send early below.
            </div>
          </div>

          {unbatched.length > 0 && (
            <button
              onClick={sendBatchNow}
              disabled={sendingBatch}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground active:scale-95 transition-transform disabled:opacity-60 whitespace-nowrap self-start sm:self-auto"
            >
              {sendingBatch ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Mail size={13} /> Send batch ({unbatched.length})
                </>
              )}
            </button>
          )}
        </div>

        {unbatched.length > 0 && unbatched.length < ORDER_BATCH_SIZE && (
          <div className="rounded-xl bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
            {ORDER_BATCH_SIZE - unbatched.length} more order
            {ORDER_BATCH_SIZE - unbatched.length !== 1 ? "s" : ""} until the automatic batch email
            fires — or click "Send batch" above to send now.
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : unbatched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No pending orders.
          </div>
        ) : (
          <OrderTable rows={unbatched} />
        )}
      </div>

      {batchedOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="display text-lg">Sent batches ({batchedOrders.length})</div>
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-destructive uppercase tracking-widest"
            >
              Clear history
            </button>
          </div>
          <OrderTable rows={batchedOrders} dimmed />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No orders yet. Orders placed via the LFR Club page will appear here.
        </div>
      )}
    </div>
  );
}

// ─── QR Codes Admin ───────────────────────────────────────────────────────────

const QR_CODES = [
  {
    id: "checkin",
    label: "Event Check-In",
    value: "LFR-CHECKIN",
    description: "One permanent code for all events. Members scan this at any event to check in.",
    color: "#e91e8c",
  },
  {
    id: "silver-redeem",
    label: "Silver Reward",
    value: "LFR-REDEEM-SILVER",
    description:
      "Permanent Silver tier redemption code. Show this to any Silver member redeeming a reward.",
    color: "#9ca3af",
  },
  {
    id: "gold-redeem",
    label: "Gold Reward",
    value: "LFR-REDEEM-GOLD",
    description:
      "Permanent Gold tier redemption code. Show this to any Gold member redeeming a reward.",
    color: "#f59e0b",
  },
  {
    id: "platinum-redeem",
    label: "Platinum Reward",
    value: "LFR-REDEEM-PLATINUM",
    description:
      "Permanent Platinum tier redemption code. Show this to any Platinum member redeeming a reward.",
    color: "#a78bfa",
  },
] as const;

function QRCodesAdmin() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          These are permanent, fixed QR codes. The check-in code works for every event. Each tier
          has one redemption code — show the matching tier code to a member when they redeem a
          reward.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {QR_CODES.map((qr) => (
          <QRCodeCard key={qr.id} qr={qr} />
        ))}
      </div>
    </div>
  );
}

// ─── Sponsors Admin ───────────────────────────────────────────────────────────

function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);

  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToSponsors((s) => {
      if (isMounted) {
        setSponsors(s);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
      unsub?.();
    };
  }, []);

  async function handleDelete(s: Sponsor) {
    if (!confirm(`Remove "${s.name}" from the sponsors banner?`)) return;
    try {
      await deleteSponsor(s.id);
      toast.success("Sponsor removed.");
    } catch {
      toast.error("Could not remove sponsor.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus size={13} /> New sponsor
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : sponsors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <ImagePlus className="mx-auto text-muted-foreground mb-3" size={28} />
          <p className="text-sm text-muted-foreground">
            No sponsors yet. Add a logo to show it on the Running Club page.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Logo</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Website</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sponsors.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30">
                    <td className="p-4">
                      <div className="w-16 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-border">
                        <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" />
                      </div>
                    </td>
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 text-muted-foreground truncate max-w-[220px]">{s.websiteUrl}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(s)}
                          className="rounded-md border border-border p-2 hover:border-primary transition active:scale-90"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="rounded-md border border-border p-2 hover:border-destructive hover:text-destructive transition active:scale-90"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <SponsorModal
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          nextOrder={sponsors.length}
        />
      )}
    </div>
  );
}

function SponsorModal({
  initial,
  onClose,
  nextOrder,
}: {
  initial?: Sponsor;
  onClose: () => void;
  nextOrder: number;
}) {
  const isEditing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function clearLogo() {
    setLogoUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo must be under 10 MB.");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const url = await uploadSponsorLogo(file, setUploadPct);
      setLogoUrl(url);
      toast.success("Logo uploaded.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Try a different image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logoUrl) {
      toast.error("Please upload a logo first.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && initial) {
        await updateSponsor(initial.id, { name, websiteUrl, logoUrl });
        toast.success("Sponsor updated.");
      } else {
        await createSponsor({ name, websiteUrl, logoUrl, order: nextOrder });
        toast.success("Sponsor added.");
      }
      onClose();
    } catch {
      toast.error("Could not save sponsor.");
    } finally {
      setSaving(false);
    }
  }

  const busy = uploading || saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="display text-2xl mb-5">{isEditing ? "Edit sponsor" : "New sponsor"}</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <In label="Sponsor name" value={name} onChange={setName} required />
          <In
            label="Website URL"
            type="url"
            value={websiteUrl}
            onChange={setWebsiteUrl}
            required
          />

          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Logo
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-primary disabled:opacity-40 active:scale-95 transition-all"
              >
                <ImagePlus size={13} />
                {uploading ? `Uploading ${uploadPct}%…` : logoUrl ? "Replace logo" : "Upload logo"}
              </button>
              {logoUrl && !uploading && (
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
                  <Check size={12} /> Uploaded
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploading && (
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            )}
            {logoUrl && !uploading && (
              <div className="rounded-xl overflow-hidden bg-white border border-border h-24 flex items-center justify-center p-3">
                <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            {logoUrl && !uploading && (
              <button
                type="button"
                onClick={clearLogo}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs uppercase tracking-widest text-destructive hover:border-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 size={14} /> Remove logo
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={14} /> {isEditing ? "Save changes" : "Save sponsor"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function QRCodeCard({
  qr,
}: {
  qr: { id: string; label: string; value: string; description: string; color: string };
}) {
const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeInstanceRef = useRef<any>(null);
  const DISPLAY_SIZE = 220;
  const EXPORT_SIZE = 1000;

useEffect(() => {
  function renderQR() {
    const container = containerRef.current;
    if (!container) return;

    // CLEAR OLD QR FIRST
    if (qrCodeInstanceRef.current) {
      container.innerHTML = "";
    }

    container.style.width = `${DISPLAY_SIZE}px`;
    container.style.height = `${DISPLAY_SIZE}px`;
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";

    // @ts-ignore
    const qrInstance = new window.QRCode(container, {
      text: qr.value,
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
      colorDark: "#000000",
      colorLight: "#ffffff",
      // @ts-ignore
      correctLevel: window.QRCode?.CorrectLevel?.H ?? 3,
    });

    qrCodeInstanceRef.current = qrInstance;

    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      canvas.style.width = `${DISPLAY_SIZE}px`;
      canvas.style.height = `${DISPLAY_SIZE}px`;
      canvas.style.display = "block";
    }
  }

  // @ts-ignore
  if (window.QRCode) {
    renderQR();
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = renderQR;
    document.head.appendChild(script);
  }

  // ✅ CLEANUP ON UNMOUNT
  return () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    qrCodeInstanceRef.current = null;
  };
}, [qr.value]);

  function getCanvas(): HTMLCanvasElement | null {
    return containerRef.current?.querySelector("canvas") ?? null;
  }

  function copyValue() {
    navigator.clipboard.writeText(qr.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildExportCanvas(canvas: HTMLCanvasElement) {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    const padding = 110;
    const qrSize = EXPORT_SIZE - padding * 2;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, padding, padding, qrSize, qrSize);

    return exportCanvas;
  }

  function download() {
    const canvas = getCanvas();
    if (!canvas) return;
    const exportCanvas = buildExportCanvas(canvas);
    if (!exportCanvas) return;
    const a = document.createElement("a");
    a.href = exportCanvas.toDataURL("image/png");
    a.download = `${qr.label.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  }

  function print() {
    const canvas = getCanvas();
    if (!canvas) return;
    const exportCanvas = buildExportCanvas(canvas);
    if (!exportCanvas) return;
    const dataUrl = exportCanvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${qr.label} QR Code</title>
      <style>
        body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#000;color:#fff;}
        img{width:280px;height:280px;border:3px solid #fff;border-radius:16px;}
        h2{margin-top:20px;font-size:18px;letter-spacing:0.2em;text-transform:uppercase;}
        p{font-size:10px;opacity:0.4;letter-spacing:0.3em;text-transform:uppercase;margin-top:6px;}
        code{font-size:11px;opacity:0.6;margin-top:4px;display:block;}
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h2>${qr.label}</h2>
        <p>Waven Harper Fitness · Little Falls Runners</p>
        <code>${qr.value}</code>
        <script>window.onload=()=>window.print();<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-5">
      <div className="text-center">
        <div className="display text-lg" style={{ color: qr.color }}>
          {qr.label}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{qr.description}</p>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-white p-3">
        <div ref={containerRef} style={{ width: 220, height: 220 }} />
      </div>

      <div className="w-full rounded-lg bg-secondary/40 px-4 py-2.5 flex items-center justify-between gap-3">
        <code className="text-xs font-mono text-foreground">{qr.value}</code>
        <button
          onClick={copyValue}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex gap-2 w-full">
        <button
          onClick={download}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:border-primary active:scale-95 transition-all"
        >
          <Download size={13} /> Download
        </button>
        <button
          onClick={print}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground active:scale-95 transition-transform"
        >
          <QrCode size={13} /> Print
        </button>
      </div>
    </div>
  );
}