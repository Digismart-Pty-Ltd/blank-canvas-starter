import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, LogOut, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import wh from "@/assets/wh-logo.jpeg";
import { doc, getDoc, onSnapshot as fsOnSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/services/authService";
import {
  subscribeToNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/notificationService";

const navLinks = [
  { to: "/", label: "Home", exact: true },
  { to: "/events", label: "Events" },
  { to: "/running-club", label: "LFR Club" },
  { to: "/gallery", label: "Gallery" },
  { to: "/membership", label: "Rewards" },
];

export function SiteHeader() {
  const { currentMember, currentOpen, logout, state } = useStore();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [liveTier, setLiveTier] = useState<string | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const authEmail = user?.email ?? undefined;
  const authMember = authEmail
    ? state.members.find((m) => m.email.toLowerCase() === authEmail.toLowerCase())
    : null;
  const effectiveMember = currentMember ?? authMember;
  const loggedIn = Boolean(user || effectiveMember || currentOpen);
  const name =
    effectiveMember?.name ?? currentOpen?.name ?? user?.displayName ?? user?.email?.split("@")[0];
  const initials = (name ?? "Guest")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  // Current user's UID for read tracking
  const uid = user?.uid ?? effectiveMember?.id ?? currentOpen?.id ?? null;

  useEffect(() => {
    if (!uid) {
      setHeaderAvatar(null);
      return;
    }
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) setHeaderAvatar(snap.data().avatarUrl ?? null);
    });
  }, [uid]);

  // Live tier subscription — keeps minTier filtering in sync with NotificationsPage
  useEffect(() => {
    if (!uid || !effectiveMember) {
      setLiveTier(null);
      return;
    }
    const unsub = fsOnSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setLiveTier((snap.data() as any).tier ?? null);
    });
    return () => unsub();
  }, [uid, effectiveMember]);

  // Role for audience filtering
  const role = effectiveMember ? "members" : currentOpen ? "open" : null;

  useEffect(() => {
    return subscribeToNotifications((all) => {
      const visible = all.filter((n) => {
        if (uid && n.deletedBy?.includes(uid)) return false;
        if (n.userId) return n.userId === uid; // personal notification (e.g. check-in reminder) — only for its owner
        if (n.audience !== "all" && n.audience !== role) return false;
        if (role !== "members") return true;
        if (n.minTier) {
          if (!liveTier) return false;
          return liveTier === n.minTier;
        }
        return true;
      });
      setNotifs(visible);
    });
  }, [role, uid, liveTier]);

  const unread = uid ? notifs.filter((n) => !n.readBy.includes(uid)) : notifs;

  // PWA app icon badge
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      if (unread.length > 0) {
        (navigator as any).setAppBadge(unread.length);
      } else {
        (navigator as any).clearAppBadge();
      }
    }
  }, [unread.length]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    navigate("/notifications");
  }

  return (
    <header
      className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md md:max-w-6xl items-center justify-between px-5 md:px-8 py-3 md:py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={wh}
            alt="WH"
            className="h-9 w-9 md:h-11 md:w-11 rounded-xl object-cover ring-1 ring-border"
          />
          <div className="leading-tight">
            <div className="display text-[13px] md:text-base tracking-[0.2em]">Waven Harper</div>
            <div className="text-[9px] md:text-[10px] tracking-[0.35em] text-muted-foreground">
              FITNESS
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.25em] transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Bell */}
          {!loading && loggedIn && (
            <div ref={bellRef} className="relative">
              <button
                onClick={handleOpen}
                className="relative h-9 w-9 md:h-10 md:w-10 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-primary"
              >
                <Bell size={15} />
                {unread.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                    {unread.length > 9 ? "9+" : unread.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Auth */}
          {loading ? (
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-secondary animate-pulse" />
          ) : loggedIn ? (
            <div className="flex items-center gap-1.5">
              <Link
                to="/membership"
                className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden grid place-items-center text-[11px] font-bold text-primary-foreground uppercase"
              >
                {headerAvatar ? (
                  <img src={headerAvatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </Link>
              <button
                onClick={async () => {
                  await logoutUser();
                  logout();
                  navigate("/");
                }}
                aria-label="Log out"
                className="h-9 w-9 md:h-10 md:w-10 grid place-items-center rounded-full border border-border text-muted-foreground hover:text-primary"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link
              to="/join"
              className="rounded-full bg-primary px-4 md:px-5 py-2 md:py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground"
            >
              Join/Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
