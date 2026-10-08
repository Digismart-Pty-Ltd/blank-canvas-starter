import { useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { StoreProvider, useStore } from "@/lib/store";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

import Home from "@/pages/Home";
import ScrollToTop from "@/components/ScrollToTop";

const Events = lazy(() => import("@/pages/Events"));
const RunningClub = lazy(() => import("@/pages/RunningClub"));
const Membership = lazy(() => import("@/pages/Membership"));
const Join = lazy(() => import("@/pages/Join"));
const Login = lazy(() => import("@/pages/Login"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Support = lazy(() => import("@/pages/Support"));
const AdvertiseApply = lazy(() => import("@/pages/AdvertiseApply"));
const Advertisements = lazy(() => import("@/pages/Advertisements"));


const queryClient = new QueryClient();

function AuthStoreSync() {
  const { user, role, loading } = useAuth();
  const { syncAuthUser } = useStore();

  const syncRef = useRef(syncAuthUser);
  useEffect(() => {
    syncRef.current = syncAuthUser;
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      syncRef.current(null, null, null);
      return;
    }
    const profileEmail = user.email;
    if (!profileEmail) return;
    syncRef.current(profileEmail, user.displayName ?? null, role ?? null);
  }, [loading, user, role]);

  return null;
}

function ManifestUpdater() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    const manifestUrl = isAdmin ? "/admin-manifest.json" : "/manifest.json";
    const appTitle = isAdmin ? "WH Admin" : "WH Fitness";
    const touchIconHref = isAdmin ? "/wh-logo-180-admin.png" : "/wh-logo-180.png";
    const themeColor = isAdmin ? "#000000" : "#000000";

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    if (manifestLink.getAttribute("href") !== manifestUrl) {
      manifestLink.setAttribute("href", manifestUrl);
    }

    let appMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!appMeta) {
      appMeta = document.createElement("meta");
      appMeta.name = "apple-mobile-web-app-title";
      document.head.appendChild(appMeta);
    }
    if (appMeta.getAttribute("content") !== appTitle) {
      appMeta.setAttribute("content", appTitle);
    }

    let touchIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!touchIconLink) {
      touchIconLink = document.createElement("link");
      touchIconLink.rel = "apple-touch-icon";
      document.head.appendChild(touchIconLink);
    }
    if (touchIconLink.getAttribute("href") !== touchIconHref) {
      touchIconLink.setAttribute("href", touchIconHref);
    }

    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColorMeta && themeColorMeta.getAttribute("content") !== themeColor) {
      themeColorMeta.setAttribute("content", themeColor);
    }
  }, [location.pathname]);

  return null;
}

function Layout() {
  const location = useLocation();

  return (
    <>
      <SiteHeader />
      <Outlet key={location.pathname} />
      <SiteFooter />
    </>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  // iOS PWA bug: env(safe-area-inset-top) can miscalculate on first paint
  // in standalone mode, showing an oversized gap until the page is scrolled.
  // Forcing a tiny scroll on mount triggers the same reflow that fixes it.
  useEffect(() => {
    const t = setTimeout(() => {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }, 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <StoreProvider>
          <AuthProvider>
            <AuthStoreSync />
            <ManifestUpdater />
            <ScrollToTop />
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/running-club" element={<RunningClub />} />
                  <Route path="/membership" element={<Membership />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/advertise" element={<AdvertiseApply />} />
                  <Route path="/advertisements" element={<Advertisements />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                {/* Admin has its own layout */}
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Suspense>
            <Toaster theme="dark" position="top-center" richColors />
          </AuthProvider>
        </StoreProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}