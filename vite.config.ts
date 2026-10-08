import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectManifest: {
        swSrc: "src/sw.ts",
        swDest: "dist/sw.js",
      },
      includeAssets: ["wh-logo.jpeg"],
      manifest: false, // manifest is handled manually via public/manifest/*.json — don't let the plugin generate/inject its own
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          admin: path.resolve(__dirname, "admin.html"),
        },
      output: {
        // Split the shared "everyone needs this" bundle into separate
        // vendor chunks so the browser can cache them independently —
        // e.g. a deploy that only changes app code won't force visitors
        // to re-download Firebase or React again.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("react-router")) return "vendor-router";
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          )
            return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("html5-qrcode")) return "vendor-qrcode";

          return "vendor";
        },
      },
    },
  },
});