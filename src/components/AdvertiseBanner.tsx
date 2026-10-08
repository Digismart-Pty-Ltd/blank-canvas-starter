import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, Megaphone } from "lucide-react";
import wh from "@/assets/wh-logo.jpeg";
import { subscribeToActiveAdvertisements, type Advertisement } from "@/lib/advertService";

const ROTATE_MS = 6000;

type Slide = Advertisement;

export default function AdvertiseBanner() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const unsub = subscribeToActiveAdvertisements(setAds);
    return () => unsub();
  }, []);

  const slides: Slide[] = ads;

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  const slide = slides[index];
  const imageUrl = slide?.imageUrl || slide?.logoUrl;
  const isBanner = slide?.adType === "banner";

  return (
    <>
      <section className="mt-8">
        <Link
          to="/advertise"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-dashed border-border bg-card px-6 py-6 hover:border-primary transition-colors"
        >
          <img
            src={wh}
            alt="Waven Harper Fitness"
            className="h-12 w-12 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary flex items-center gap-1.5">
              <Megaphone size={12} /> Sponsored spot open
            </div>
            <div className="mt-1 display text-xl">Advertise here.</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Put your business in front of our community — apply in minutes.
            </p>
          </div>
          <ArrowUpRight
            size={16}
            className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
          />
        </Link>
      </section>

      {slide && imageUrl && (
        <section className="mt-4">
          <a
            href={slide.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card hover:border-primary transition-colors ${
              isBanner ? "flex-col items-stretch p-0" : "px-6 py-6"
            }`}
          >
            <div
              className={
                isBanner
                  ? "aspect-[4/1] w-full overflow-hidden bg-black"
                  : "h-14 w-14 rounded-2xl bg-black flex items-center justify-center overflow-hidden shrink-0 border border-border"
              }
            >
              <img
                src={imageUrl}
                alt={slide.businessName}
                loading="lazy"
                decoding="async"
                className={
                  isBanner ? "h-full w-full object-cover" : "max-h-full max-w-full object-contain"
                }
              />
            </div>
            <div className={isBanner ? "w-full px-5 pb-5" : "flex-1 min-w-0"}>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Sponsored</div>
              <div className="mt-1 display text-xl truncate">{slide.businessName}</div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{slide.slogan}</p>
            </div>
            <ArrowUpRight
              size={16}
              className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
            />
          </a>
          <div className="mt-3 text-center">
            <Link
              to="/advertisements"
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              View all advertisements
            </Link>
          </div>
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all ${
                    i === index ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
