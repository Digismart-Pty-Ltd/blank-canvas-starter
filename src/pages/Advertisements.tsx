import { useEffect, useState } from "react";
import { ArrowUpRight, Megaphone, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  isAdvertisementLive,
  subscribeToAdvertisements,
  type Advertisement,
} from "@/lib/advertService";

export default function Advertisements() {
  const [adverts, setAdverts] = useState<Advertisement[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<Advertisement | null>(null);
  const [bannerZoomed, setBannerZoomed] = useState(false);

  useEffect(() => {
    document.title = "Advertisements - Waven Harper Fitness";
    return subscribeToAdvertisements((rows) => {
      setAdverts(rows.filter((ad) => isAdvertisementLive(ad)));
    });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pt-16 pb-10">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Our partners</div>
        <h1 className="mt-3 display text-4xl md:text-6xl">Advertisements.</h1>
        <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
          Businesses supporting the Waven Harper Fitness community.
        </p>
      </section>

      <section className="mx-auto max-w-md md:max-w-6xl px-5 md:px-8 pb-24">
        {adverts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No active advertisements right now.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {adverts.map((ad) => {
              const imageUrl = ad.imageUrl || ad.logoUrl;
              const isBanner = ad.adType === "banner";
              return (
                <article
                  key={ad.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
                >
                  <div
                    className={`flex items-center justify-center overflow-hidden bg-black p-4 ${
                      isBanner ? "aspect-[4/1]" : "h-40"
                    }`}
                  >
                    {imageUrl ? (
                      isBanner ? (
                        <button
                          type="button"
                          aria-label={`Enlarge ${ad.businessName} banner`}
                          onClick={() => {
                            setSelectedBanner(ad);
                            setBannerZoomed(false);
                          }}
                          className="relative h-full w-full cursor-zoom-in"
                        >
                          <img
                            src={imageUrl}
                            alt={ad.businessName}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute right-2 top-2 rounded-full bg-black/75 p-2 text-white">
                            <ZoomIn size={16} />
                          </span>
                        </button>
                      ) : (
                        <a
                          href={ad.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Visit ${ad.businessName}`}
                          className="flex h-full w-full items-center justify-center"
                        >
                          <img
                            src={imageUrl}
                            alt={ad.businessName}
                            loading="lazy"
                            decoding="async"
                            className="max-h-full max-w-full object-contain"
                          />
                        </a>
                      )
                    ) : (
                      <Megaphone className="text-muted-foreground" size={28} />
                    )}
                  </div>
                  <a
                    href={ad.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-4 p-5"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-primary">
                        Sponsored
                      </div>
                      <h2 className="mt-1 display text-xl truncate">{ad.businessName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ad.slogan}</p>
                    </div>
                    <ArrowUpRight className="shrink-0 text-muted-foreground group-hover:text-foreground" size={18} />
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={selectedBanner !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBanner(null);
            setBannerZoomed(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl max-h-[90vh] overflow-hidden border-border bg-black p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="truncate">{selectedBanner?.businessName} banner</DialogTitle>
            <button
              type="button"
              aria-label={bannerZoomed ? "Fit banner to screen" : "Zoom in on banner"}
              title={bannerZoomed ? "Fit to screen" : "Zoom in"}
              onClick={() => setBannerZoomed((zoomed) => !zoomed)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-foreground hover:bg-white/10"
            >
              {bannerZoomed ? <ZoomOut size={17} /> : <ZoomIn size={17} />}
            </button>
          </div>
          {selectedBanner && (
            <div className="max-h-[75vh] overflow-auto">
              <img
                src={selectedBanner.imageUrl || selectedBanner.logoUrl}
                alt={selectedBanner.businessName}
                className={`h-auto transition-[width] duration-200 ${
                  bannerZoomed ? "w-[200%] max-w-none" : "w-full"
                }`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
