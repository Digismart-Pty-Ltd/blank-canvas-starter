import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, Trophy, User, Images } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import AdvertiseBanner from "@/components/AdvertiseBanner";

const SHOW_AD_BANNER = true;

const tabs = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/running-club", label: "LFR Club", icon: User },
  { to: "/gallery", label: "Gallery", icon: Images },
  { to: "/membership", label: "Rewards", icon: Trophy },
];

export function SiteFooter() {
  const { pathname } = useLocation();
  const { currentMember, currentOpen } = useStore();
  const { user } = useAuth();
  const loggedIn = Boolean(user || currentMember || currentOpen);

  return (
    <>
      {SHOW_AD_BANNER && (
        <div className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pb-4 md:pb-6">
          <AdvertiseBanner />
        </div>
      )}

      {/* ── Desktop footer ── */}
      <footer className="hidden md:block border-t border-border mt-8">
        <div className="mx-auto max-w-6xl px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} Waven Harper Fitness. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            {!loggedIn && (
              <>
                <span className="opacity-30">·</span>
                <Link to="/admin" className="hover:text-foreground transition">
                  Staff
                </Link>
              </>
            )}
            <span className="opacity-30">·</span>
            <Link to="/support" className="hover:text-foreground transition">
              Support
            </Link>

            <span className="opacity-30">·</span>
            <Link to="/advertisements" className="hover:text-foreground transition">
              Advertisements
            </Link>

            <span className="opacity-30">·</span>
            <a
              href="https://dsmart.co.za"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition"
            >
              Built by Digismart
            </a>
          </div>
        </div>
      </footer>

      {/* ── Mobile footer ── */}
      <footer className="md:hidden border-t border-border">
        <div className="mx-auto max-w-6xl px-8 py-6 flex flex-col items-center gap-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center w-full">
            © {new Date().getFullYear()} Waven Harper Fitness. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
            {" "}
            <Link to="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            {!loggedIn && (
              <>
                <span className="opacity-30">·</span>
                <Link to="/admin" className="hover:text-foreground transition">
                  Staff
                </Link>
              </>
            )}
            <span className="opacity-30">·</span>
            <Link to="/support" className="hover:text-foreground transition">
              Support
            </Link>
            <span className="opacity-30">·</span>
            <Link to="/advertisements" className="hover:text-foreground transition">
              Advertisements
            </Link>
            <span className="opacity-30">·</span>
            <a
              href="https://dsmart.co.za"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition"
            >
              Built by Digismart
            </a>
          </div>
        </div>
      </footer>

      <nav className="md:hidden">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-glow px-2 py-2 grid grid-cols-5 gap-1">
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                  <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">
                    {t.label}
                  </span>
                  {active && <span className="absolute -top-1 h-1 w-6 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
