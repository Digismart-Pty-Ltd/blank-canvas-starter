import { Link } from "react-router-dom";
import { useStore, nextTierInfo } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";
import {
  Award,
  Calendar,
  Gift,
  Lock,
  Trophy,
  User,
  Phone,
  ShieldCheck,
  Pencil,
  Check,
  Loader2,
  X,
} from "lucide-react";
import type { Tier } from "@/lib/demo-data";
import { useEffect, useState, useRef } from "react";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { Html5Qrcode } from "html5-qrcode";

const tierMeta: Record<Tier, { color: string; need: number }> = {
  Pink: { color: "#e91e8c", need: 0 },
  Silver: { color: "var(--silver)", need: 12 },
  Gold: { color: "var(--gold)", need: 24 },
  Platinum: { color: "var(--platinum)", need: 36 },
};

// ── Phone validator (same as Events page) ────────────────────────────────────
function isValidPhone(value: string) {
  return /^[+]?[\d\s\-().]{7,15}$/.test(value.trim());
}

function daysLeftFor(r: { createdAt?: string | Date; expiresInDays: number }): number | null {
  if (!r.createdAt) return null;
  const created = new Date(r.createdAt).getTime();
  const expiry = created + r.expiresInDays * 24 * 60 * 60 * 1000;
  const msLeft = expiry - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export default function Membership() {
  const { user, isMember, loading } = useAuth();
const { currentMember, state } = useStore();

  // ── Firestore profile state ───────────────────────────────────────────────
  const [contact, setContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [profileFetched, setProfileFetched] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [draftContact, setDraftContact] = useState("");
  const [draftEmergencyName, setDraftEmergencyName] = useState("");
  const [draftEmergencyNumber, setDraftEmergencyNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [emergencyNumberError, setEmergencyNumberError] = useState("");
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [firestoreTier, setFirestoreTier] = useState<Tier | null>(null);
  const [firestoreName, setFirestoreName] = useState<string | null>(null);

  // ── Firestore live registrations for this member ──────────────────────────
  const [liveRegistrations, setLiveRegistrations] = useState<Array<{ id: string; eventId: string; checkedInAt?: string }>>([]);
  const [liveRaceCount, setLiveRaceCount] = useState<number | null>(null);
  const [scanningReward, setScanningReward] = useState<{ id: string; title: string } | null>(null);
  const [firestoreRewards, setFirestoreRewards] = useState<Array<{ id: string; tier: Tier; title: string; description: string; createdAt?: string; expiresInDays: number }>>([]);
  const [redemptions, setRedemptions] = useState<Array<{ id: string; rewardId: string; redeemedAt: string }>>([]);

  useEffect(() => {
    document.title = "Membership & Rewards — Waven Harper Fitness";
  }, []);

  const uid = user?.uid ?? currentMember?.id;

  // Fetch profile from Firestore
  useEffect(() => {
    if (!uid || !isMember) {
      setProfileFetched(true);
      return;
    }
    setProfileFetched(false);
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) {
        setContact("");
        setEmergencyName("");
        setEmergencyNumber("");
        setAvatarUrl(null);
        setFirestoreTier(null);
        setFirestoreName(null);
        setProfileFetched(true);
        return;
      }
      const data = snap.data() as {
        contact?: string;
        avatarUrl?: string | null;
        tier?: Tier;
        name?: string;
        emergency?: string;
      };
      if (data.contact !== undefined) setContact(data.contact);
      if (data.avatarUrl !== undefined) setAvatarUrl(data.avatarUrl ?? null);
      if (data.tier) setFirestoreTier(data.tier as Tier);
      if (data.name) setFirestoreName(data.name);
      if (data.emergency) {
        const parts = data.emergency.split(" — ");
        setEmergencyName(parts[0]?.trim() ?? "");
        setEmergencyNumber(parts[1]?.trim() ?? "");
      }
      setProfileFetched(true);
    }, (err) => {
      console.error("Membership profile listener failed:", err);
      setProfileFetched(true);
    });
    return () => unsub();
  }, [uid, isMember]);

  // ── Lazy tier maintenance: Jan 1 reset + Platinum 6-month retention ────────
  // Runs client-side whenever the member opens this page (instead of a
  // scheduled Cloud Function). Each rule only fires once per real-world
  // period thanks to the lastTierCheck/lastTierReset stamps.
  useEffect(() => {
    if (!uid || !isMember) return;

    async function runTierMaintenance() {
      const userRef = doc(db, "users", uid!);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;

      const data = snap.data() as {
        tier?: Tier;
        tierResetAt?: string;
        lastTierCheck?: string;
      };
      const currentTier = data.tier as Tier | undefined;
      if (!currentTier) return;

      const today = new Date();
      const isJan1 = today.getMonth() === 0 && today.getDate() === 1;
      const lastResetYear = data.tierResetAt ? new Date(data.tierResetAt).getFullYear() : null;

      // Rule 1: annual reset on Jan 1 — only once per year, even if they
      // open the app multiple times that day.
      if (isJan1 && lastResetYear !== today.getFullYear()) {
        await updateDoc(userRef, {
          tier: "Pink",
          tierResetAt: today.toISOString(),
        });
        return; // tier just changed, skip the Platinum check below this run
      }

      // Rule 2: Platinum retention — downgrade one level if fewer than 12
      // check-ins in the trailing 6 months. Checked at most once a day.
      if (currentTier === "Platinum") {
        const lastChecked = data.lastTierCheck ? new Date(data.lastTierCheck) : null;
        const checkedToday = lastChecked && lastChecked.toDateString() === today.toDateString();

        if (!checkedToday) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const regsQuery = query(collection(db, "eventRegistrations"), where("userId", "==", uid));
          const regsSnap = await getDocs(regsQuery);
          const recentCheckIns = regsSnap.docs.filter((d) => {
            const r = d.data() as { checkedInAt?: string };
            return r.checkedInAt && new Date(r.checkedInAt) >= sixMonthsAgo;
          }).length;

          const updates: Record<string, string> = { lastTierCheck: today.toISOString() };
          if (recentCheckIns < 12) {
            updates.tier = "Gold";
            updates.tierDowngradedAt = today.toISOString();
          }
          await updateDoc(userRef, updates);
        }
      }
    }

    runTierMaintenance().catch((err) => console.error("Tier maintenance failed:", err));
  }, [uid, isMember]);

  // Live listener for this member's registrations
  useEffect(() => {
    if (!uid || !isMember) return;
    const q = query(
      collection(db, "eventRegistrations"), // ← was "registrations"
      where("userId", "==", uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const regs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { eventId: string; checkedInAt?: string }) }));
      setLiveRegistrations(regs);
      // Only count events where the member actually checked in
      setLiveRaceCount(regs.filter((r) => r.checkedInAt).length);
    });
    return () => unsub();
  }, [uid, isMember]);

  // right after the eventRegistrations useEffect, add:
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, "rewards"), (snap) => {
      setFirestoreRewards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as { tier: Tier; title: string; description: string; createdAt?: string; expiresInDays: number }) })));
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
  if (!uid) return;
  const q = query(collection(db, "redemptions"), where("userId", "==", uid));
  const unsub = onSnapshot(q, (snap) => {
    setRedemptions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as { rewardId: string; redeemedAt: string }) })));
  }, (err) => {
    console.error("Membership redemptions listener failed:", err);
    setRedemptions([]);
  });
  return () => unsub();
}, [uid]);

  function startEditing() {
    setDraftName(me?.name ?? "");
    setDraftContact(contact);
    setDraftEmergencyName(emergencyName);
    setDraftEmergencyNumber(emergencyNumber);
    setNameError("");
    setContactError("");
    setEmergencyNumberError("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setNameError("");
    setContactError("");
    setEmergencyNumberError("");
  }

  async function saveProfile() {
    let valid = true;
    if (!draftName.trim()) {
      setNameError("Name cannot be empty.");
      valid = false;
    } else {
      setNameError("");
    }
    if (draftContact && !isValidPhone(draftContact)) {
      setContactError("Please enter a valid phone number.");
      valid = false;
    } else {
      setContactError("");
    }
    if (draftEmergencyNumber && !isValidPhone(draftEmergencyNumber)) {
      setEmergencyNumberError("Please enter a valid phone number.");
      valid = false;
    } else {
      setEmergencyNumberError("");
    }
    if (!valid) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "users", uid!), {
        name: draftName.trim(),
        email: user?.email ?? me?.email ?? "",
        contact: draftContact,
        emergency: `${draftEmergencyName} — ${draftEmergencyNumber}`,
      }, { merge: true });
      if (user) await updateProfile(user, { displayName: draftName.trim() });
      setContact(draftContact);
      setEmergencyName(draftEmergencyName);
      setEmergencyNumber(draftEmergencyNumber);
      setEditing(false);
      toast.success("Profile updated.");
    } catch (err) {
      console.error(err);
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRedeemReward(rewardId: string) {
  if (!uid) return;
  try {
    await addDoc(collection(db, "redemptions"), {
      userId: uid,
      rewardId,
      redeemedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    toast.error("Could not save redemption. Please try again.");
  }
}

async function handleRemoveRedemption(rewardId: string) {
  const entry = redemptions.find((r) => r.rewardId === rewardId);
  if (!entry) return;
  try {
    await deleteDoc(doc(db, "redemptions", entry.id));
    toast.success("Reward removed from your list.");
  } catch (err) {
    console.error(err);
    toast.error("Could not remove reward.");
  }
}

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const bitmap = await createImageBitmap(file);
      const MAX = 128;
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const base64 = canvas.toDataURL("image/jpeg", 0.5);
      await setDoc(doc(db, "users", uid!), { avatarUrl: base64 }, { merge: true });
      setAvatarUrl(base64);
      toast.success("Profile photo updated.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarRemove() {
    if (!uid) return;
    try {
      await setDoc(doc(db, "users", uid), { avatarUrl: null }, { merge: true });
      setAvatarUrl(null);
      toast.success("Profile photo removed.");
    } catch (err) {
      console.error(err);
      toast.error("Could not remove photo.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <Lock size={11} className="text-primary" /> Members only
          </div>
          <h1 className="mt-6 display text-3xl">Join to unlock.</h1>
          <p className="mt-4 text-muted-foreground">
            Tier progression, rewards and your event history live here. Become a member to start
            counting your events.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/join"
              className="rounded-full bg-primary px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow"
            >
              Join the club
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-border px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-primary"
            >
              Log in
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const authEmail = user?.email ?? undefined;
  const me =
    currentMember ??
    (authEmail
      ? state.members.find((m) => m.email.toLowerCase() === authEmail.toLowerCase())
      : null) ??
    (user
      ? {
          id: uid ?? `member:${(authEmail ?? "unknown").toLowerCase()}`,
          name: user.displayName?.trim() || (authEmail ? authEmail.split("@")[0] : "Member"),
          email: authEmail ?? "",
          joined: new Date().toISOString().slice(0, 10),
          races: 0,
          tier: "Pink" as Tier,
          rewardsPending: 0,
        }
      : null);

  if (!me) return null;
  // Override with live Firestore values if available
  const effectiveMe = {
    ...me,
    tier: firestoreTier ?? me.tier,
    name: firestoreName ?? me.name,
  };
  const name = effectiveMe.name;
  const initials = name
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("");

  // Prefer live Firestore race count; fall back to store value
  const raceCount = liveRaceCount ?? me.races;

  const { next, needed, target } = nextTierInfo(raceCount);
  const progress = Math.min(100, (raceCount / target) * 100);
  const tierOrder: Tier[] = ["Pink", "Silver", "Gold", "Platinum"];
  const myTierIndex = tierOrder.indexOf(effectiveMe.tier);
  const now = Date.now();
  const myRewards =
    firestoreTier === null
      ? []
      : firestoreRewards.filter((r) => {
          if (r.tier !== firestoreTier) return false;
          if (!r.createdAt) return true; // no date stamp, don't block it
          const created = new Date(r.createdAt).getTime();
          const expiry = created + r.expiresInDays * 24 * 60 * 60 * 1000;
          return now <= expiry;
        });
const redeemed = new Set(redemptions.map((r) => r.rewardId));

  // Upcoming events: match live registrations against the event list
  const registeredEventIds = new Set(liveRegistrations.map((r) => r.eventId));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const myUpcoming = state.events.filter((e) => {
    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);
    return registeredEventIds.has(e.id) && eventDate >= today;
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-16 pb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Member Dashboard</div>
        <div className="mt-4 flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden ring-2 ring-border flex items-center justify-center text-xl font-bold text-primary-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt={me.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Pencil size={14} className="text-white" />
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </label>
          <div>
            <h1 className="display text-3xl">Hey {effectiveMe.name.split(" ")[0]}.</h1>
            <p className="mt-1 text-sm text-muted-foreground">Here's where you stand.</p>
            {avatarUrl && (
              <button
                onClick={handleAvatarRemove}
                className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-7">
          <Trophy className="text-primary" />
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Current tier
          </div>
          <div
            className="mt-2 display text-3xl"
            style={{ color: tierMeta[effectiveMe.tier].color }}
          >
            {effectiveMe.tier}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {effectiveMe.tier === "Platinum"
              ? "Top tier reached"
              : `${needed} more events to ${next}`}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7">
          <Calendar className="text-primary" />
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Events checked in
          </div>
          <div className="mt-2 display text-4xl">{raceCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">counts toward your tier</div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7">
          <Gift className="text-primary" />
          <div className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Rewards available
          </div>
          <div className="mt-2 display text-4xl">
            {myRewards.filter((r) => !redeemed.has(r.id)).length}
          </div>
        </div>
      </section>

      {/* ── Profile & emergency details ───────────────────────────────────── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-16">
        <div className="flex items-center justify-between">
          <h2 className="display text-3xl">Your profile</h2>
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:border-primary active:scale-95 transition-all"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8 space-y-5">
          {/* Name & email — read-only */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField icon={User} label="Full name" value={me.name} />
            <ProfileField icon={User} label="Email" value={me.email} locked />
          </div>

          {/* Contact & emergency — editable */}
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-[11px] text-primary">
                <ShieldCheck size={13} />
                These details are used to pre-fill event sign-ups and shared with organisers in an
                emergency.
              </div>

              <div>
                <EditField label="Full name" value={draftName} onChange={setDraftName} />
                {nameError && <p className="mt-1 text-[11px] text-destructive">{nameError}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <EditField
                    label="Contact number"
                    value={draftContact}
                    onChange={setDraftContact}
                    type="tel"
                  />
                  {contactError && (
                    <p className="mt-1 text-[11px] text-destructive">{contactError}</p>
                  )}
                </div>
                <div>
                  <EditField
                    label="Emergency contact name"
                    value={draftEmergencyName}
                    onChange={setDraftEmergencyName}
                  />
                </div>
                <div>
                  <EditField
                    label="Emergency contact number"
                    value={draftEmergencyNumber}
                    onChange={setDraftEmergencyNumber}
                    type="tel"
                  />
                  {emergencyNumberError && (
                    <p className="mt-1 text-[11px] text-destructive">{emergencyNumberError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60 active:scale-95 transition-transform"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-destructive hover:text-destructive active:scale-95 transition-all"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField icon={Phone} label="Contact number" value={contact || "—"} />
              <ProfileField
                icon={ShieldCheck}
                label="Emergency contact"
                value={
                  emergencyName && emergencyNumber
                    ? `${emergencyName} · ${emergencyNumber}`
                    : emergencyName || emergencyNumber || "—"
                }
              />
            </div>
          )}

          {!profileFetched && !editing && (
            <p className="text-[11px] text-muted-foreground">Loading profile…</p>
          )}
        </div>
      </section>

      {/* ── Tier progress ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-16">
        <h2 className="display text-3xl">Tier progress</h2>
        <div className="mt-6 rounded-3xl border border-border bg-card p-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Check-ins
              </div>
              <div className="mt-1 display text-3xl">{raceCount}</div>
            </div>
            <div className="text-right">
              {needed > 0 ? (
                <>
                  <div className="text-sm font-semibold text-primary">
                    {needed} to {next}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {raceCount} / {target} check-ins
                  </div>
                </>
              ) : (
                <div className="text-sm font-semibold text-primary">Top tier reached</div>
              )}
            </div>
          </div>
          <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["Pink", "Silver", "Gold", "Platinum"] as Tier[]).map((t) => (
              <div
                key={t}
                className={`rounded-xl border p-4 text-center ${
                  effectiveMe.tier === t ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <Award className="mx-auto" style={{ color: tierMeta[t].color }} />
                <div className="mt-2 display text-lg" style={{ color: tierMeta[t].color }}>
                  {t}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {tierMeta[t].need}+ events
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Tiers reset every January 1. Platinum stays if you log 12+ events in any 6-month window.
          </p>
        </div>
      </section>

      {/* ── Rewards ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-16">
        <h2 className="display text-3xl">Your rewards</h2>
        {myRewards.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing in your tier yet. Keep stacking events.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {myRewards.map((r) => {
              const isRedeemed = redeemed.has(r.id);
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4"
                >
                  <div className="rounded-xl bg-primary/15 p-3">
                    <Gift className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="display text-lg">{r.title}</div>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {r.tier}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        disabled={isRedeemed}
                        onClick={() => setScanningReward({ id: r.id, title: r.title })}
                        className="rounded-full bg-primary px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                      >
                        {isRedeemed ? "Redeemed" : "Redeem"}
                      </button>
{isRedeemed ? (
  <button
    onClick={() => {
      if (confirm("Remove this redeemed reward from your list?")) {
        handleRemoveRedemption(r.id);
      }
    }}
    className="rounded-full border border-border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive active:scale-95 transition-all"
  >
    Remove
  </button>
) : (
  <span
    className={`text-[10px] uppercase tracking-widest ${
      daysLeftFor(r) !== null && daysLeftFor(r)! <= 5
        ? "text-destructive"
        : "text-muted-foreground"
    }`}
  >
    {daysLeftFor(r) !== null
      ? `${daysLeftFor(r)} day${daysLeftFor(r) !== 1 ? "s" : ""} left to redeem`
      : `Expires in ${r.expiresInDays} days`}
  </span>
)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Upcoming events ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 mt-16 pb-10">
        <h2 className="display text-3xl">Your upcoming events</h2>
        {myUpcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No bookings yet.{" "}
            <Link to="/events" className="text-primary underline">
              See events
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {myUpcoming.map((e) => {
              const reg = liveRegistrations.find((r) => r.eventId === e.id);
              return (
                <div key={e.id} className="flex items-center justify-between p-5">
                  <div>
                    <div className="display text-lg">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toDateString()} · {e.time} · {e.meetingPlace}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-widest ${
                      reg?.checkedInAt ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {reg?.checkedInAt ? "✓ Checked in" : "Booked"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

{scanningReward && (
  <QRScanModal
    rewardTitle={scanningReward.title}
    expectedCode={`LFR-REDEEM-${(effectiveMe.tier ?? "SILVER").toUpperCase()}`}
    onSuccess={() => {
      handleRedeemReward(scanningReward.id);
      toast.success(`Redeemed: ${scanningReward.title}`);
      setScanningReward(null);
    }}
    onClose={() => setScanningReward(null)}
  />
)}
    </div>
  );
}

// ── Small display-only profile field ─────────────────────────────────────────
function ProfileField({
  icon: Icon,
  label,
  value,
  locked = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary/30 p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon size={11} />
        {label}
        {locked && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 normal-case tracking-normal">
            Read-only
          </span>
        )}
      </div>
      <div className="mt-1.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

function QRScanModal({
  rewardTitle,
  expectedCode,
  onSuccess,
  onClose,
}: {
  rewardTitle: string;
  expectedCode: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`).current;

  const tierLabel = expectedCode.replace("LFR-REDEEM-", "");
  const tierColors: Record<string, string> = {
    SILVER: "#9ca3af",
    GOLD: "#f59e0b",
    PLATINUM: "#a78bfa",
    PINK: "#e91e8c",
  };
  const tierColor = tierColors[tierLabel] ?? "#e91e8c";

  // Just flip the flag — this triggers the div to render.
  function startCamera() {
    setError("");
    setScanning(true);
  }

  function stopCamera() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    }
    setScanning(false);
  }

  // Only touch the DOM/camera once the reader div has actually mounted.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    (async () => {
      try {
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            stopCamera();
            if (decodedText === expectedCode) {
              onSuccess();
            } else {
              toast.error(`Wrong QR code. Ask admin for the ${tierLabel} tier code.`);
            }
          },
          () => {
            // per-frame miss — expected, ignore
          },
        );
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Could not access camera. Please allow camera access and try again.");
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanning]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="display text-xl">Redeem reward</div>
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: tierColor }}>
            {rewardTitle}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Ask admin for the{" "}
            <span style={{ color: tierColor }} className="font-semibold">
              {tierLabel}
            </span>{" "}
            QR code, then scan it.
          </p>
        </div>

        {!scanning ? (
          <button
            onClick={startCamera}
            className="w-full rounded-full bg-primary px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground active:scale-95 transition-transform"
          >
            Open camera & scan
          </button>
        ) : (
          <div className="w-full space-y-3">
            <div
              id={readerId}
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover"
            />
            <button
              onClick={stopCamera}
              className="w-full rounded-full border border-border py-2.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive hover:border-destructive transition"
            >
              Cancel
            </button>
          </div>
        )}

        {error && <p className="text-xs text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}