import { useEffect, useRef } from "react";
import { ArrowUpRight, Instagram } from "lucide-react";

// FIX (PWA safe-area / lightbox close button clash): when the app runs as an
// installed PWA (display-mode: standalone) with viewport-fit=cover, content
// renders UNDER the iOS/Android status bar. Elfsight's lightbox popup is
// injected as a fixed-position overlay at top:0 that knows nothing about the
// safe area, so its close (×) button lands right behind the clock/battery
// icons and becomes untappable.
//
// This watches the DOM for whatever Elfsight actually injects, finds the
// close button by behavior (class/aria-label hint or × / ✕ glyph) rather
// than a guessed class name, and nudges ONLY that element down with an
// inline style. We don't pad the whole popup — that just creates dead
// white space above the actual content.
function useElfsightSafeAreaFix() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return; // only needed inside the installed PWA

    const OFFSET = "calc(env(safe-area-inset-top, 0px) + 8px)";

    const fixPopup = (popup: Element) => {
      // Only nudge the close control itself — don't pad the whole popup,
      // that just creates dead space above the actual content.
      const candidates = popup.querySelectorAll<HTMLElement>(
        '[class*="close" i], [aria-label*="close" i], button, [role="button"]'
      );
      candidates.forEach((el) => {
        const looksLikeClose =
          /close/i.test(el.className) ||
          /close/i.test(el.getAttribute("aria-label") || "") ||
          el.textContent?.trim() === "×" ||
          el.textContent?.trim() === "✕";
        if (!looksLikeClose) return;

        const style = window.getComputedStyle(el);
        if (style.position === "fixed" || style.position === "absolute") {
          el.style.setProperty("top", OFFSET, "important");
        }
      });
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (/eapps/i.test(node.className) && /popup|modal|lightbox/i.test(node.className)) {
            fixPopup(node);
          }
          // Also check descendants in case the popup is nested inside a
          // wrapper node that was added in one batch.
          node
            .querySelectorAll?.('[class*="eapps"][class*="popup" i], [class*="eapps"][class*="modal" i]')
            .forEach((el) => fixPopup(el));
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}

export default function Gallery() {
  const elfsightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Gallery — Little Falls Runners";
  }, []);

  useElfsightSafeAreaFix();

  // Load Elfsight script once, re-init on return visits
  useEffect(() => {
    if (!document.querySelector('script[src*="elfsightcdn.com"]')) {
      const script = document.createElement("script");
      script.src = "https://elfsightcdn.com/platform.js";
      script.async = true;
      document.body.appendChild(script);
    } else if ((window as any).eapps) {
      try {
        (window as any).eapps.Platform.loadWidgets?.();
      } catch (_) {}
    }
  }, []);

  // FIX (navigation delay bug): Elfsight injects iframes and overlay elements
  // into the DOM that linger after you leave the page. These leftover elements
  // intercept pointer events and block React Router navigation, making the app
  // feel frozen until the user reloads. Cleaning them up on unmount fixes this.
  useEffect(() => {
    return () => {
      document.querySelectorAll('[class*="eapps-"]').forEach((el) => el.remove());
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-16 pb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Community</div>
        <h1 className="mt-3 display text-4xl md:text-7xl">Gallery.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
          Moments from the road. Follow along on Instagram for more.
        </p>
      </section>

      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pb-20">
        <div className="rounded-3xl border border-border bg-card overflow-visible">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Instagram size={12} /> Latest posts from Instagram
              </div>
              <a
                href="https://www.instagram.com/littlefallsrunners"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-0.5"
              >
                Open Instagram <ArrowUpRight size={11} />
              </a>
            </div>
          <div className="p-2 md:p-4" style={{ isolation: "isolate" }}>
            <div
              ref={elfsightRef}
              className="elfsight-app-3ccf5b0d-6644-40ea-a8cf-41e7c993aa40"
              data-elfsight-app-lazy
            />
          </div>
        </div>
      </section>
    </div>
  );
}