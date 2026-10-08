import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginUser } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import { LogIn, Eye, EyeOff, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { savePushToken } from "@/lib/notificationService";
import { requestPushToken } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

type View = "login" | "reset" | "reset-sent";

export default function Login() {
  const nav = useNavigate();
  const { user, isMember, loading } = useAuth();
  const [view, setView] = useState<View>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    document.title = "Log In — Waven Harper Fitness";
  }, []);

  const [loginPrompted, setLoginPrompted] = useState(false);

  useEffect(() => {
    if (!loading && user && loginPrompted) {
      const pushGranted =
        typeof Notification !== "undefined" && Notification.permission === "granted";

      if (!pushGranted) {
        nav("/notifications", { replace: true, state: { fromLogin: true } });
      } else {
        nav(isMember ? "/membership" : "/events", { replace: true });
      }
    }
  }, [user, isMember, loading, loginPrompted]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let permissionPromise: Promise<NotificationPermission> | null = null;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      permissionPromise = Notification.requestPermission();
    }

    try {
      await loginUser(email, password);
      setLoginPrompted(true);

      // Push notifications are optional and must not make a successful login
      // look like it failed when iOS/Android blocks the service worker or token.
      try {
        const permission = permissionPromise
          ? await permissionPromise
          : typeof Notification !== "undefined"
            ? Notification.permission
            : "default";

        if (permission === "granted" && auth.currentUser) {
          const token = await requestPushToken();
          if (token) {
            await savePushToken(auth.currentUser.uid, token);
          }
        }
      } catch (pushError) {
        console.warn("Push notification setup skipped after successful login:", pushError);
      }
    } catch (err: any) {
      setSubmitting(false);
      switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          toast.error("Invalid email or password.");
          break;
        case "auth/invalid-email":
          toast.error("Please enter a valid email.");
          break;
        case "auth/too-many-requests":
          toast.error("Too many attempts. Please wait a moment and try again.");
          break;
        default:
          toast.error("Login failed. Please try again.");
      }
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return toast.error("Please enter your email address.");
    setSendingReset(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setView("reset-sent");
    } catch (err: any) {
      switch (err.code) {
        case "auth/user-not-found":
          // Don't reveal whether the email exists — just show the success screen
          setView("reset-sent");
          break;
        case "auth/invalid-email":
          toast.error("Please enter a valid email address.");
          break;
        default:
          toast.error("Could not send reset email. Please try again.");
      }
    } finally {
      setSendingReset(false);
    }
  }

  // ── Reset sent confirmation ───────────────────────────────────────────────
  if (view === "reset-sent") {
    return (
      <div className="min-h-screen bg-background">
        <section className="mx-auto max-w-md px-5 pt-14 pb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-primary">Password reset</div>
          <h1 className="mt-3 display text-3xl">Check your inbox.</h1>
        </section>
        <section className="mx-auto max-w-md px-5 pb-20">
          <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mx-auto">
              <Mail size={28} className="text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-foreground font-medium">Reset link sent</p>
              <p className="text-sm text-muted-foreground">
                If <span className="text-foreground">{resetEmail}</span> is registered, you'll
                receive a password reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
            </div>
            <button
              onClick={() => {
                setView("login");
                setResetEmail("");
              }}
              className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2"
            >
              <LogIn size={14} /> Back to log in
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── Forgot password form ──────────────────────────────────────────────────
  if (view === "reset") {
    return (
      <div className="min-h-screen bg-background">
        <section className="mx-auto max-w-md px-5 pt-14 pb-6">
          <button
            onClick={() => setView("login")}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition mb-6"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="text-xs uppercase tracking-[0.3em] text-primary">Forgot password</div>
          <h1 className="mt-3 display text-3xl">Reset password.</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Enter your registered email and we'll send you a reset link.
          </p>
        </section>
        <section className="mx-auto max-w-md px-5 pb-20">
          <form
            onSubmit={handleReset}
            className="rounded-3xl border border-border bg-card p-6 space-y-4"
          >
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Email address *
              </span>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={sendingReset}
              className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sendingReset ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Mail size={14} /> Send reset link
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ── Login form (default) ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md px-5 pt-14 pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Welcome back</div>
        <h1 className="mt-3 display text-3xl">Log in.</h1>
        <p className="mt-4 text-muted-foreground">
          No account?{" "}
          <Link to="/join" className="text-primary underline">
            Join here
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-md px-5 pb-20">
        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-border bg-card p-6 space-y-4"
        >
          {/* Email */}
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Email *
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </label>

          {/* Password with show/hide */}
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Password *
            </span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setView("reset");
              }}
              className="text-[11px] text-muted-foreground hover:text-primary transition underline underline-offset-2"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Logging in…
              </>
            ) : (
              <>
                <LogIn size={14} /> Log In
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
