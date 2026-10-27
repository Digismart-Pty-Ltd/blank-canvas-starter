import { precacheAndRoute } from "workbox-precaching";

// Required placeholder — vite-plugin-pwa injects the asset list here
precacheAndRoute((self as any).__WB_MANIFEST);

// Activate updated app assets promptly when an installed PWA is opened.
self.addEventListener("install", () => (self as any).skipWaiting());
self.addEventListener("activate", (event: any) => {
  event.waitUntil((self as any).clients.claim());
});

// Standard web push (no Firebase). Payload: { title, body, link }
self.addEventListener("push", (event: any) => {
  let data: { title?: string; body?: string; link?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text?.() };
  }
  event.waitUntil(
    (self as any).registration.showNotification(data.title || "Waven Harper Fitness", {
      body: data.body || "",
      icon: "/wh-logo.jpeg",
      data: { link: data.link || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil((self as any).clients.openWindow(event.notification.data?.link || "/"));
});
