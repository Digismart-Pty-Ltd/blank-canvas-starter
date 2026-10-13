import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Reset Password — Waven Harper Fitness";

    const isRecoveryLink =
      window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).has("code");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecoveryLink)) {
        setReady(true);
        setChecked(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecoveryLink) setReady(true);
      // Give the auth client a moment to process the link before showing "invalid".
      setTimeout(() => setChecked(true), 1500);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password should be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Could not update password. Please request a new reset link.");
      return;
    }
    toast.success("Password updated.");
    nav("/membership", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md px-5 pt-14 pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Password reset</div>
        <h1 className="mt-3 display text-3xl">Set a new password.</h1>
      </section>

      <section className="mx-auto max-w-md px-5 pb-20">
        {!ready ? (
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-center">
            {!checked ? (
              <Loader2 size={20} className="mx-auto animate-spin text-primary" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Please request a new one.
                </p>
                <Link to="/login" className="text-primary underline text-sm">
                  Back to log in
                </Link>
              </>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border bg-card p-6 space-y-4"
          >
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                New password *
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

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Confirm password *
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-primary px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <KeyRound size={14} /> Update password
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
