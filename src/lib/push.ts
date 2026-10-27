import { supabase } from "@/integrations/supabase/client";

/** Public web-push key (safe to ship in the browser). */
export const VAPID_PUBLIC_KEY =
  "BHeJ3XSWq7cbfrFjWfGReeminndyeEJVtmIsUpqry4XO7kfG0Jrl5Xd4D-G2BZaDNVn-zbHfSycKfi1MLC0Fgkg";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Ask permission, subscribe this browser to standard web push and save the
 * subscription for the signed-in user. Returns the subscription JSON or null.
 */
export async function requestPushToken(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
      return null;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const registration = await navigator.serviceWorker.ready;
    const sub =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    const token = JSON.stringify(sub.toJSON());
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { error } = await supabase.rpc("register_push_token", { p_token: token });
      if (error) console.error("Could not save push subscription:", error);
    }
    return token;
  } catch (err) {
    console.error("Push subscription error:", err);
    return null;
  }
}
