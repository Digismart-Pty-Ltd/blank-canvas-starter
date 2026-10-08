import { Link } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { formatDistanceKm } from "@/lib/utils";
import community from "@/assets/community.jpg";
import lfr from "@/assets/lfr-logo-clean.png";
import trainerPhoto from "@/assets/trainer.jpeg";
import {
  ArrowUpRight, Dumbbell, MapPin, Users, Clock, ChevronRight, Instagram,
} from "lucide-react";

export default function Home() {
  const { state } = useStore();
  const waContact = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Waven — I'd like to get in touch.")}`;

  const todayStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
  const upcoming = state.events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">

      <main className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-4 md:pt-10 pb-2">

{/* ── HERO: full-bleed photo, headline over the image, stat strip overlapping the edge ── */}
<section className="relative md:max-w-2xl md:mx-auto">
  <div className="relative overflow-hidden rounded-3xl border border-border">
    <img
      src={trainerPhoto}
      alt="Waven Harper training a client"
      className="w-full h-[62vh] min-h-[420px] max-h-[620px] md:max-h-[680px] object-cover object-top"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
<div className="absolute inset-x-0 bottom-0 p-5 pb-8 md:p-8">
  <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
    Waven Harper Fitness <span className="opacity-40">·</span>
    <MapPin size={11} /> Roodepoort
  </div>
  <h1 className="display text-3xl md:text-6xl leading-[1.05] md:leading-[0.95] text-foreground max-w-xl">
    13 years. One mission: your strongest self.
  </h1>
</div>
</div>

{/* Stat strip, bleeding over the bottom edge of the hero */}
<div className="relative -mt-2 md:-mt-8 px-2">
    <div className="grid grid-cols-3 gap-2 md:gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-2 py-3 md:py-4 shadow-lg">
      {[
        { value: "13+", label: "Years Experience" },
        { value: "1:1", label: "Personal Coaching" },
        { value: "RDP", label: "Roodepoort Based" },
      ].map((s) => (
        <div key={s.label} className="text-center">
          <div className="display text-xl md:text-2xl text-foreground">{s.value}</div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

{/* ── CONTACT CTA: right after the hero, before About ── */}
<section className="mt-4">
  <div className="flex gap-3">
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Waven, I came across your website. Can we chat about personal training packages?")}`}
      target="_blank"
      rel="noreferrer"
      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-background"
    >
      Contact us <ArrowUpRight size={13} />
    </a>
  </div>
</section>

        {/* ── QUICK LINKS ── */}
        <section className="mt-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-3">Quick Links</div>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink icon={MapPin} title="Find an Event" sub="Upcoming events this week" to="/events" />
          </div>
        </section>

        {/* ── UPCOMING EVENTS ── */}
        <section className="mt-8">
          <div className="flex items-end justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">Upcoming Events</div>
            <Link to="/events" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="-mx-5 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-5 pb-2 min-w-min">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No upcoming events. Check back soon.</p>
              ) : (
                upcoming.map((e) => (
                  <Link to="/events" key={e.id}
                    className="group relative w-[180px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="relative h-[140px]">
                      <img src={e.image} alt={e.title} loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105 duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      {e.membersOnly && (
                        <span className="absolute top-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-background">
                          Members
                        </span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                          <Clock size={9} /> {new Date(e.date + "T12:00:00").toDateString().slice(4, 10)} · {formatDistanceKm(e.distanceKm)}K
                        </div>
                        <div className="mt-0.5 display text-[14px] leading-tight line-clamp-2 text-foreground">{e.title}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section className="mt-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-3">About</div>
          <h2 className="display text-3xl md:text-5xl leading-tight mb-4">
            More than a personal trainer.<br />Real results.
          </h2>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <span className="display text-foreground text-base">Meet Waven Harper</span>
            </p>
            <p>
              Fitness has always been more than just training for me — it's about transformation, discipline, and helping people become the strongest version of themselves, both physically and mentally.
            </p>
            <p>
              With over 13 years of experience in the fitness industry as a qualified personal trainer, I've dedicated my career to helping individuals achieve real, lasting results. My journey started with a passion for self-improvement and quickly grew into a purpose-driven career focused on motivating and empowering others through health and fitness.
            </p>
            <p>
              Over the years, I've worked with people from all walks of life, helping them build confidence, improve their strength, lose weight, and create healthier lifestyles that are sustainable long term. My training philosophy combines discipline, consistency, and personalised coaching to ensure every client feels supported throughout their fitness journey.
            </p>
            <p>
              I chose the fitness industry because I genuinely love seeing people transform — not just physically, but mentally and emotionally too. There's nothing more rewarding than helping someone achieve goals they once believed were impossible.
            </p>
            <p>
              As a trainer, my goal is to create an environment where people feel motivated, challenged, and inspired to become the best version of themselves. Whether you're just starting out or looking to take your fitness to the next level, I'm here to guide you every step of the way.
            </p>
            <p>
              My mission is simple: to help people unlock their full potential through fitness, confidence, and consistency.
            </p>
            <p className="text-foreground font-medium">
              Welcome to the journey.<br />
              <span className="display text-base">— Waven Harper</span>
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {["Strength Training", "Personal Training", "Weight Loss", "Nutrition Guidance", "Body Transformation"].map((tag) => (
              <span key={tag} className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ── COMMUNITY / RUNNING CLUB ── */}
        <section className="mt-8 relative overflow-hidden rounded-3xl border border-border">
          <img
            src={community}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="relative p-6 pt-40 md:pt-56">
            <div className="mb-4 h-20 w-20 md:h-28 md:w-28 overflow-hidden rounded-full ring-2 ring-border shadow-lg bg-background/80">
              <img src={lfr} alt="LFR" className="h-full w-full object-contain" />
            </div>
            <div className="marker text-foreground text-lg">"No one is chasing us."</div>
            <h2 className="mt-1 display text-2xl md:text-3xl leading-tight">
              A club for runners,
              <br />
              not a brand for posters.
            </h2>
            <Link
              to="/running-club"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Meet the crew <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}

function QuickLink({ icon: Icon, title, sub, to, highlight }: { icon: any; title: string; sub: string; to: string; highlight?: boolean }) {
  return (
    <Link to={to}
      className={`group relative overflow-hidden rounded-2xl border p-4 min-h-[90px] flex flex-col justify-between ${
        highlight ? "border-border/80 bg-secondary/40" : "border-border bg-card"
      } hover:border-foreground/40 transition`}>
      <Icon size={18} className="text-muted-foreground" />
      <div>
        <div className="display text-sm leading-tight">{title}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
      <ArrowUpRight size={13} className="absolute right-3 top-3 text-muted-foreground group-hover:text-foreground transition" />
    </Link>
  );
}