import { precacheAndRoute } from "workbox-precaching";

// Required placeholder — vite-plugin-pwa injects the asset list here
precacheAndRoute((self as any).__WB_MANIFEST);

// Activate updated app assets promptly when an installed PWA is opened.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event: any) => {
  event.waitUntil((self as any).clients.claim());
});

// @ts-ignore
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
// @ts-ignore
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// @ts-ignore
firebase.initializeApp({
  apiKey: "AIzaSyDDBixfjibs_YCXqcq7afvYRcDN95_QqRE",
  authDomain: "wavenharperfitness-app.firebaseapp.com",
  projectId: "wavenharperfitness-app",
  storageBucket: "wavenharperfitness-app.firebasestorage.app",
  messagingSenderId: "758777495621",
  appId: "1:758777495621:web:56252e64f1e8b94643a32c",
});

// @ts-ignore
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload: any) => {
  // @ts-ignore
  self.registration.showNotification(payload.data.title, {
    body: payload.data.body,
    icon: "/wh-logo.jpeg",
    data: { link: payload.data.link || "/notifications" },
  });
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil((self as any).clients.openWindow(event.notification.data?.link || "/"));
});
