import { useEffect, useState } from "react";

function setAppManifest(isAdmin: boolean) {
  const manifestUrl = isAdmin ? "/admin-manifest.json" : "/manifest.json";
  const appTitle = isAdmin ? "WH Admin" : "WH Fitness";
  const touchIconHref = isAdmin ? "/wh-logo-180-admin.png" : "/wh-logo-180.png";
  const themeColor = isAdmin ? "#ff6b35" : "#000000";

  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    document.head.appendChild(manifestLink);
  }
  manifestLink.setAttribute("href", manifestUrl);

  let appMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!appMeta) {
    appMeta = document.createElement("meta");
    appMeta.name = "apple-mobile-web-app-title";
    document.head.appendChild(appMeta);
  }
  appMeta.setAttribute("content", appTitle);

  let touchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!touchIconLink) {
    touchIconLink = document.createElement("link");
    touchIconLink.rel = "apple-touch-icon";
    document.head.appendChild(touchIconLink);
  }
  touchIconLink.setAttribute("href", touchIconHref);

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", themeColor);
  }
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    function beforeInstallHandler(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", beforeInstallHandler as EventListener);
  }, []);

  async function handleInstall(isAdmin: boolean) {
    if (isAdmin) {
      setAppManifest(true);
      window.location.assign("/admin");
      return;
    }

    // Ensure manifest and apple meta reflect target app
    setAppManifest(isAdmin);

    // If we have the beforeinstallprompt event (Android/Chromium), use it
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (err) {
        // ignore
      }
      setDeferredPrompt(null);
      return;
    }

    // For iOS or browsers that don't expose prompt: show instructions overlay
    setShowIosInstructions(true);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleInstall(false)}
        className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Install
      </button>
      <button
        onClick={() => handleInstall(true)}
        className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Install Admin
      </button>

      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-sm rounded-lg bg-card p-6 text-center">
            <h3 className="mb-2 text-lg font-semibold">Add to Home Screen</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              On iPhone, tap the Share button and choose "Add to Home Screen" to install the app.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowIosInstructions(false)}
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
