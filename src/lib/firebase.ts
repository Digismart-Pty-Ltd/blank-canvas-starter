import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDDBixfjibs_YCXqcq7afvYRcDN95_QqRE",
  authDomain: "wavenharperfitness-app.firebaseapp.com",
  projectId: "wavenharperfitness-app",
  storageBucket: "wavenharperfitness-app.firebasestorage.app",
  messagingSenderId: "758777495621",
  appId: "1:758777495621:web:56252e64f1e8b94643a32c",
  measurementId: "G-MXDE9F0YYG",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const storage = getStorage(app);

const VAPID_KEY =
  "BD40LOcFV2_7xSwmFc6R2fUs7Ii-R67x_b6uXw6DduYS9VJzv1Sc3ECH5QJ1cwHpLFnKfzghhpZO37sZvgX7LzE"; // from Step 1

export async function requestPushToken(): Promise<string | null> {
  try {
    if (!(await isSupported())) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token ?? null;
  } catch (err) {
    console.error("Push token error:", err);
    return null;
  }
}
