import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.DEV) {
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.unregister())
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service workers are optional during local development.
    });
  });
}

const params = new URLSearchParams(window.location.search);
const pwaType = params.get("pwa");
const hasAdminSession = localStorage.getItem("wh_admin_session") === "1";

if (pwaType === "admin" && !window.location.pathname.startsWith("/admin")) {
  window.location.replace("/admin/");
} else if (pwaType === "customer" && window.location.pathname.startsWith("/admin")) {
  window.location.replace("/");
} else if (
  !pwaType &&
  hasAdminSession &&
  (window.location.pathname === "/" || window.location.pathname === "")
) {
  window.location.replace("/admin/?pwa=admin");
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
