import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { formatDistanceKm } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Coffee,
  ChevronDown,
  Users,
  AlertTriangle,
  X,
  Check,
  MapPinned,
  Lock,
  Loader2,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import type { Event } from "@/lib/demo-data";
import { subscribeToEvents } from "@/lib/eventService";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { db } from "@/lib/firebase";
import { subscribeToSponsors, type Sponsor } from "@/lib/sponsorService";
import { useAuth } from "@/context/AuthContext";

export default function Events() {
  const { state, setEvents } = useStore();
  const [searchParams] = useSearchParams();
  const checkinEventId = searchParams.get("checkin");
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [visibleIndex, setVisibleIndex] = useState(0);

  useEffect(() => {
    document.title = "Events — Waven Harper Fitness";
  }, []);

  // Auto-scroll to the event that needs check-in
  useEffect(() => {
    if (!checkinEventId) return;
    const el = scrollRef.current[checkinEventId];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", inline: "center" }), 300);
    }
  }, [checkinEventId, state.events]);

  // Events are already kept in sync by the global StoreProvider subscription.
  // No local listener here to avoid duplicate Firestore listen channels.

  useEffect(() => {
    return () => {
      document.querySelectorAll('[id^="checkin-reader-"], .html5-qrcode').forEach((node) => {
        if (node instanceof Element) {
          node.querySelectorAll("video").forEach((video) => {
            const stream = video.srcObject as MediaStream | null;
            stream?.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
          });
        }
        node.remove();
      });
    };
  }, []);

  const todayStr = new Date().toLocaleDateString("en-CA");
  const upcomingEvents = state.events.filter((e) => e.date >= todayStr);

  

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-16 pb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">What's next</div>
        <h1 className="mt-3 display text-4xl md:text-7xl">Events.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
          The next events on the calendar. Book your spot, lace up, see you there.
        </p>
      </section>

<section className="relative pb-10 min-h-screen">
          {upcomingEvents.length === 0 ? (
          <div className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 py-20 text-center text-muted-foreground text-sm">
            No upcoming events scheduled. Check back soon.
          </div>
        ) : (
<div
  className="relative flex w-full overflow-x-auto snap-x snap-proximity scrollbar-hide"
  style={{ scrollbarWidth: "none", overscrollBehavior: "auto" }}
  onScroll={(e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = window.innerWidth;
    const index = Math.round(scrollLeft / width);
    setVisibleIndex(index);
  }}
>
{upcomingEvents.map((e, i) => {
  const isVisible = Math.abs(i - visibleIndex) <= 1; // Load current + adjacent
  
  return (
    <div
      key={e.id}
      ref={(el) => {
        scrollRef.current[e.id] = el;
      }}
      className={`snap-center shrink-0 w-screen min-h-[calc(100vh-140px)] px-4 md:px-12 flex flex-col justify-start pt-2 pb-10 ${
        checkinEventId === e.id ? "ring-2 ring-primary/40 rounded-3xl" : ""
      }`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {upcomingEvents.map((_, j) => (
          <span
            key={j}
            className={`block rounded-full transition-all ${
              j === i ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"
            }`}
          />
        ))}
      </div>
      <div className="mx-auto w-full max-w-xl">
        {isVisible ? (
          <EventCard e={e} />
        ) : (
          <div className="h-96 rounded-3xl bg-secondary/40 animate-pulse" />
        )}
      </div>
      {upcomingEvents.length > 1 && (
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-5">
          {i + 1} / {upcomingEvents.length} — swipe for more
        </p>
      )}
    </div>
  );
})}
          </div>
        )}
      </section>

      <SponsorsBanner />
    </div>
  );
}

function isValidPhone(value: string) {
  return /^[+]?[\d\s\-().]{7,15}$/.test(value.trim());
}
function SponsorsBanner() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    const unsub = subscribeToSponsors((s) => {
      if (isMounted) {
        setSponsors(s);
      }
    });

    return () => {
      isMounted = false;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const interval = window.setInterval(() => {
      carouselApi.scrollNext();
    }, 3500);

    return () => window.clearInterval(interval);
  }, [carouselApi]);

  if (sponsors.length === 0) return null;

  return (
    <section className="mt-24 mb-16">
      <div className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 text-center mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Proudly supported by</div>
        <h2 className="mt-2 display text-3xl md:text-5xl">Our sponsors.</h2>
      </div>

      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 border-y border-border bg-card relative">
        <Carousel
          opts={{ loop: true, align: "start", containScroll: "trimSnaps" }}
          setApi={setCarouselApi}
          className="relative"
        >
          <CarouselPrevious aria-label="Previous sponsor" className="hidden md:block" />
          <CarouselContent className="flex touch-pan-x gap-2 px-2 md:px-3">
            {sponsors.map((s) => (
              <CarouselItem
                key={s.id}
                className="basis-auto min-w-[160px] sm:min-w-[180px] md:min-w-[220px] max-w-[220px] rounded-3xl"
              >
                <a
                  href={s.websiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex h-28 w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-background p-4 transition duration-300 hover:shadow-lg"
                  title={s.name}
                >
                  <img
                    src={s.logoUrl}
                    alt={s.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNext aria-label="Next sponsor" className="hidden md:block" />
        </Carousel>
      </div>
    </section>
  );
}
const EventCard = React.memo(function EventCard({ e }: { e: Event }) {
  const { currentMember, currentOpen, state } = useStore();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [attendOpen, setAttendOpen] = useState(false);

  const [attendees, setAttendees] = useState<
    { id: string; name: string; checkedInAt?: string; openRunner?: boolean; tier?: string }[]
  >([]);
  const [myReg, setMyReg] = useState<{ id: string; checkedInAt?: string } | null>(null);

  // Resolve the logged-in user the same way SiteHeader does: prefer the
  // store's currentMember, but fall back to matching the Firebase auth
  // user's email against known members. This keeps this component in sync
  // with the header instead of flashing "not logged in" whenever
  // currentMember hasn't been hydrated into the store yet (e.g. on refresh).
  const authEmail = user?.email ?? undefined;
  const authMember = authEmail
    ? state.members.find((m) => m.email.toLowerCase() === authEmail.toLowerCase())
    : null;
  const effectiveMember = currentMember ?? authMember;

  const currentUser = effectiveMember ?? currentOpen;
  const isLoggedIn = Boolean(user || currentUser);
useEffect(() => {
  if (!e.id) return;
  let isMounted = true;

  const q = query(
    collection(db, "eventRegistrations"),
    where("eventId", "==", e.id),
    limit(200) // ✅ ADD LIMIT - no need to load all registrations
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!isMounted) return; // ✅ Don't update if unmounting
      
      const regs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAttendees(regs);
      
      if (currentUser?.id) {
        const mine = regs.find((r: any) => r.userId === currentUser.id) ?? null;
        setMyReg(mine);
      }
    },
    (err) => {
      if (!isMounted) return;
      console.error("Attendees subscription error:", err);
    }
  );

  return () => {
    isMounted = false;
    unsub();
  };
}, [e.id, currentUser?.id]);

  const [name, setName] = useState(currentUser?.name ?? "");
  const [contact, setContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");

  // ✅ ADD THIS CLEANUP EFFECT
useEffect(() => {
  if (!signupOpen) {
    setContactError("");
    setEmergencyNumberError("");
    setAccepted(false); 
  }
}, [signupOpen]);
  
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [contactError, setContactError] = useState("");
  const [emergencyNumberError, setEmergencyNumberError] = useState("");


  

  // Keep the name field in sync once we resolve who the user actually is
  // (covers the case where currentUser wasn't known yet on first render).
  useEffect(() => {
    if (currentUser?.name && !name) setName(currentUser.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.name]);

useEffect(() => {
  const memberId = effectiveMember?.id;
  if (!memberId) return;

  let isMounted = true;

  getDoc(doc(db, "users", memberId))
    .then((snap) => {
      if (!isMounted || !snap.exists()) return; // ✅ Check if still mounted
      
      const data = snap.data() as any;
      if (data.contact) setContact(data.contact);
      if (data.emergency) {
        const parts = data.emergency.split(" — ");
        setEmergencyName(parts[0]?.trim() ?? "");
        setEmergencyNumber(parts[1]?.trim() ?? "");
      }
      setProfileLoaded(true);
    })
    .catch((err) => {
      if (!isMounted) return;
      console.error("Profile fetch error:", err);
    });

  return () => {
    isMounted = false;
  };
}, [effectiveMember?.id]);

  const [signingUp, setSigningUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const blocked = e.membersOnly && !effectiveMember;

  const start = new Date(`${e.date}T${e.time}`);
  const now = new Date();
  const windowOpen =
    now.getTime() >= start.getTime() - 30 * 60_000 &&
    now.getTime() <= start.getTime() + 2 * 60 * 60_000;
  const checkInClosed = now.getTime() > start.getTime() + 2 * 60 * 60_000;
  const registrationClosed = now.getTime() >= start.getTime();

  function validateContact(value: string) {
    if (value && !isValidPhone(value)) {
      setContactError("Please enter a valid phone number.");
      return false;
    }
    setContactError("");
    return true;
  }

  function validateEmergencyNumber(value: string) {
    if (value && !isValidPhone(value)) {
      setEmergencyNumberError("Please enter a valid phone number.");
      return false;
    }
    setEmergencyNumberError("");
    return true;
  }

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault();

    const contactOk = validateContact(contact);
    const emergencyOk = validateEmergencyNumber(emergencyNumber);
    if (!contactOk || !emergencyOk) return;

    if (!name.trim()) return toast.error("Please enter your full name.");
    if (!contact.trim()) return toast.error("Please enter your contact number.");
    if (!emergencyName.trim()) return toast.error("Please enter your emergency contact's name.");
    if (!emergencyNumber.trim())
      return toast.error("Please enter your emergency contact's number.");

    setSigningUp(true);
    try {
      if (myReg) {
        toast.error("You're already signed up for this event.");
        return;
      }

      await addDoc(collection(db, "eventRegistrations"), {
        eventId: e.id,
        userId: currentUser?.id ?? null,
        name,
        contact,
        emergency: `${emergencyName} — ${emergencyNumber}`,
        openRunner: !effectiveMember,
        tier: (effectiveMember as any)?.tier ?? null,
        checkedInAt: null,
        reminderSent: false, // ← add this
        createdAt: serverTimestamp(),
      });

      toast.success(`You're in — ${e.title}`);
      setSignupOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Sign-up failed. Please try again.");
    } finally {
      setSigningUp(false);
    }
  }

  async function doCheckIn() {
    if (!myReg) {
      toast.error("You're not signed up for this event.");
      return;
    }
    setCheckingIn(true);
    try {
      await updateDoc(doc(db, "eventRegistrations", myReg.id), {
        checkedInAt: new Date().toISOString(),
      });
      toast.success("Checked in! Event counted.");
    } catch (err) {
      console.error(err);
      toast.error("Check-in failed. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  }

  function handleCheckIn() {
    setScannerOpen(true);
  }

  async function handleCancel() {
    if (!myReg) return;
    if (!window.confirm("Cancel this booking? You can rebook later if needed.")) return;

    setCancelling(true);
    try {
      await deleteDoc(doc(db, "eventRegistrations", myReg.id));
      toast("Booking cancelled.");
    } catch (err) {
      console.error(err);
      toast.error("Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card">
      <div
        className={`relative overflow-hidden ${(e as any).imageOrientation === "portrait" ? "aspect-[3/4]" : "aspect-[16/9]"}`}
      >
        {e.image ? (
          <img
            src={e.image}
            alt={e.title}
            loading="lazy"
            decoding="async" 
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-secondary flex items-center justify-center">
            <Calendar className="text-muted-foreground" size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent" />
        {e.membersOnly && (
          <span className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
            Members Only
          </span>
        )}
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground border border-border">
          <AlertTriangle size={11} className="text-primary" /> Participate at your own risk
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-primary">
          <span>
            {(e as any).distanceDisplay ?? formatDistanceKm(e.distanceKm)}
          </span>
          <span>·</span>
          <span>{new Date(e.date).toDateString()}</span>
        </div>
        <h3 className="mt-2 display text-2xl">{e.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Info icon={Clock} label="Start" value={e.time} />
          <Info icon={Calendar} label="Date" value={new Date(e.date).toDateString().slice(4)} />
          <Info icon={MapPin} label="Meet at" value={e.meetingPlace} />
          <Info icon={Coffee} label="After event" value={e.afterRunPlace} />
        </div>

        {/* Waiver — only shown if logged in and not yet registered */}
        {isLoggedIn && !myReg && (
          <div className="mt-5 rounded-xl border border-border">
            <button
              onClick={() => setOpen(!open)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground active:bg-secondary/40 transition-colors"
            >
              Indemnity & waiver
              <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="px-4 pb-4 text-xs text-muted-foreground space-y-2 max-h-72 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  "No one is chasing us." — Little Falls Runners NPC
                </p>
                <p>
                  <strong className="text-foreground">Acknowledgement of Risk.</strong> I
                  acknowledge that participation in running and fitness events involves inherent
                  risks including but not limited to physical injury, illness or death. I
                  voluntarily assume all such risks.
                </p>
                <p>
                  <strong className="text-foreground">Medical Fitness.</strong> I confirm that I am
                  physically and medically fit to participate in this event. I have consulted a
                  medical professional where necessary and take full responsibility for my health
                  and wellbeing during participation.
                </p>
                <p>
                  <strong className="text-foreground">Indemnity & Release.</strong> I hereby
                  indemnify and hold harmless Little Falls Runners NPC, Waven Harper Fitness, its
                  directors, organisers, volunteers, sponsors and representatives from any and all
                  claims, damages, losses, costs or expenses arising from my participation,
                  including claims arising from negligence.
                </p>
                <p>
                  <strong className="text-foreground">Personal Responsibility.</strong> I agree to
                  follow all safety guidance, obey applicable road rules, act responsibly during the
                  event and run or walk within my personal limits at all times.
                </p>
                <p>
                  <strong className="text-foreground">Voluntary Participation.</strong> I understand
                  that my participation is entirely voluntary. I may withdraw at any time, and
                  accept that I do so at my own risk without claim against the organisers.
                </p>
                <p>
                  <strong className="text-foreground">Emergency Contact.</strong> I authorise event
                  organisers to obtain emergency medical treatment on my behalf if I am unable to
                  communicate and I acknowledge that associated costs are my own responsibility.
                </p>
                <p>
                  <strong className="text-foreground">Media Consent.</strong> I consent to
                  photographs and video footage taken at events being used for community
                  communication, social media, and promotional purposes by Little Falls Runners NPC
                  and Waven Harper Fitness.
                </p>
                <p>
                  <strong className="text-foreground">Governing Law.</strong> This agreement is
                  governed by and construed in accordance with the laws of the Republic of South
                  Africa. Any disputes shall be subject to the jurisdiction of South African courts.
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 px-4 pb-3 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(ev) => setAccepted(ev.target.checked)}
                className="accent-primary"
              />
              <span>Accept all — I have read and agree to the full waiver.</span>
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {/* Members-only gate */}
          {blocked ? (
            <Link
              to="/join"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary active:scale-95 transition-transform"
            >
              <Lock size={14} /> Members only — Join
            </Link>
          ) : /* Still resolving auth state — avoid flashing the logged-out UI */
          authLoading ? (
            <div className="h-10 w-40 rounded-full bg-secondary/40 animate-pulse" />
          ) : /* Not logged in — show login/join prompt instead of sign-up */
          !isLoggedIn ? (
            <div className="w-full rounded-2xl border border-border bg-secondary/30 px-5 py-4">
              <p className="text-sm text-muted-foreground mb-3">
                You need an account to sign up for events.
              </p>
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground active:scale-95 transition-transform"
                >
                  <LogIn size={13} /> Log in
                </Link>
                <Link
                  to="/join"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-primary active:scale-95 transition-all"
                >
                  Join free
                </Link>
              </div>
            </div>
          ) : /* Already registered */
          myReg ? (
            <>
              {myReg.checkedInAt ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Check size={14} /> Checked in
                </span>
              ) : checkInClosed ? (
                <div className="w-full rounded-2xl border border-border bg-secondary/30 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Check-in window has closed for this event. If you attended but weren't checked
                    in, please contact an organiser or visit the{" "}
                    <Link to="/membership" className="text-primary underline">
                      admin desk
                    </Link>{" "}
                    so they can check you in manually.
                  </p>
                </div>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    <Check size={14} /> Booked
                  </span>
                  <button
                    onClick={handleCheckIn}
                    disabled={!windowOpen || checkingIn}
                    title={!windowOpen ? "Check-in opens 30 min before the event" : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 transition-transform"
                  >
                    {checkingIn ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MapPinned size={14} />
                    )}
                    {checkingIn ? "Checking in…" : "Scan to check in"}
                  </button>
                </>
              )}
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-destructive hover:text-destructive active:scale-95 transition-all disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : null}
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </>
          ) : /* Logged in, not yet registered */
          registrationClosed ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Lock size={14} /> Registration closed
            </span>
          ) : (
            <button
              disabled={!accepted}
              onClick={() => setSignupOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              Sign up
            </button>
          )}

          <button
            onClick={() => setAttendOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:border-primary active:scale-95 transition-all"
          >
            <Users size={14} /> Attendees ({attendees.length})
          </button>
        </div>
      </div>

      {/* ── Sign-up modal ── */}
      {signupOpen && (
        <Modal onClose={() => !signingUp && setSignupOpen(false)}>
          <div className="display text-2xl">Confirm spot</div>
          <p className="text-sm text-muted-foreground mt-1">
            {e.title} · {new Date(e.date).toDateString()}
          </p>

          {effectiveMember && profileLoaded && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-[11px] text-primary">
              <ShieldCheck size={13} />
              Emergency details loaded from your member profile.
            </div>
          )}

          <form onSubmit={handleSignup} className="mt-4 space-y-3">
            <Field label="Full name" value={name} onChange={setName} required />

            <div>
              <Field
                label="Contact number"
                value={contact}
                onChange={(v) => {
                  setContact(v);
                  if (contactError) validateContact(v);
                }}
                type="tel"
                required
                locked={!!effectiveMember && !!contact}
              />
              {contactError && <p className="mt-1 text-[11px] text-destructive">{contactError}</p>}
            </div>

            <Field
              label="Emergency contact name"
              value={emergencyName}
              onChange={setEmergencyName}
              required
              locked={!!effectiveMember && !!emergencyName}
            />

            <div>
              <Field
                label="Emergency contact number"
                value={emergencyNumber}
                onChange={(v) => {
                  setEmergencyNumber(v);
                  if (emergencyNumberError) validateEmergencyNumber(v);
                }}
                type="tel"
                required
                locked={!!effectiveMember && !!emergencyNumber}
              />
              {emergencyNumberError && (
                <p className="mt-1 text-[11px] text-destructive">{emergencyNumberError}</p>
              )}
            </div>

            {effectiveMember && (emergencyName || emergencyNumber) && (
              <p className="text-[11px] text-muted-foreground">
                Wrong details?{" "}
                <Link to="/membership" className="text-primary underline">
                  Update your profile
                </Link>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={signingUp}
              className="w-full rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
            >
              {signingUp ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Confirming…
                </>
              ) : (
                "Confirm booking"
              )}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Attendees modal ── */}
      {attendOpen && (
        <Modal onClose={() => setAttendOpen(false)}>
          <div className="display text-2xl">Who's coming</div>
          <p className="text-sm text-muted-foreground mt-1">{e.title}</p>
          {attendees.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No one signed up yet. Be the first.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-border max-h-72 overflow-y-auto">
              {attendees.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2">
                    {a.name}
                    {a.checkedInAt && (
                      <span className="text-[10px] uppercase tracking-widest text-primary">
                        · in
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] ${a.openRunner ? "text-muted-foreground" : "text-primary"}`}
                  >
                    {a.openRunner ? "Open Runner" : (a.tier ?? "Member")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      {/* ── Check-in QR scanner modal ── */}
      {scannerOpen && (
        <CheckInScanModal
          onSuccess={async () => {
            setScannerOpen(false);
            await doCheckIn();
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </article>
  );
}, (prevProps, nextProps) => prevProps.e.id === nextProps.e.id);

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  locked = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  locked?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          {label}
          {required && " *"}
        </span>
        {locked && (
          <span className="flex items-center gap-1 text-primary normal-case tracking-normal font-normal">
            <ShieldCheck size={11} /> From profile
          </span>
        )}
      </span>
      <input
        value={value}
        required={required}
        type={type}
        readOnly={locked}
        onChange={(e) => !locked && onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
          locked
            ? "border-border bg-secondary/40 text-muted-foreground cursor-default select-none"
            : "border-border bg-background focus:border-primary"
        }`}
      />
    </label>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

function CheckInScanModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = useRef(`checkin-reader-${Math.random().toString(36).slice(2)}`).current;

function stopCamera() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
        .finally(() => {
          // Force-release the camera and wipe any leftover video/canvas
          // nodes html5-qrcode injected directly into the DOM — same class
          // of bug as the Elfsight leftover-node issue on Gallery.
          const el = document.getElementById(readerId);
          if (el) {
            el.querySelectorAll("video").forEach((v) => {
              const stream = v.srcObject as MediaStream | null;
              stream?.getTracks().forEach((t) => t.stop());
              v.srcObject = null;
            });
            el.innerHTML = "";
          }
        });
    }
  }

useEffect(() => {
  let isMounted = true;

  async function start() {
    try {
      const scanner = new Html5Qrcode(readerId);
      
if (!isMounted) {
  // Component unmounted before scanner initialized
  try {
    scanner.clear();
  } catch {
    // ignore
  }
  return;
}

      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          if (!isMounted) return; // ✅ Don't process if unmounting
          stopCamera();
          if (decodedText === "LFR-CHECKIN") {
            onSuccess();
          } else {
            toast.error("Wrong QR code. Ask the organiser for the check-in code.");
            onClose();
          }
        },
        () => {
          // per-frame miss — expected, ignore
        },
      );
    } catch (err: any) {
      if (!isMounted) return;
      console.error(err);
      setError("Camera access denied. Please allow camera access and try again.");
    }
  }

  start();

  // ✅ IMPROVED CLEANUP
  return () => {
    isMounted = false;
    if (scannerRef.current) {
      stopCamera();
    }
  };
}, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 flex flex-col items-center gap-5"
        onClick={(ev) => ev.stopPropagation()}
      >
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
        >
          <X size={18} />
        </button>
        <div className="text-center">
          <div className="display text-xl">Check in</div>
          <p className="text-sm text-muted-foreground mt-2">
            Point your camera at the organiser's QR code.
          </p>
        </div>
        {error ? (
          <p className="text-xs text-destructive text-center">{error}</p>
        ) : (
          <div
            id={readerId}
            className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover"
          />
        )}
      </div>
    </div>,
    document.body
  );
}