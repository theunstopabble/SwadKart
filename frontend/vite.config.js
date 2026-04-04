import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
        devOptions: {
          enabled: true,
        },
        // 🛠️ WORKBOX: Offline Support + Live API Block + KILL SWITCH
        workbox: {
          // 👇🔥 KILL SWITCH: These 3 lines force delete old cache & activate new SW immediately
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,

          // Cache static files
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],

          // 👇 Prevent SW from handling API or Socket requests (Fixes the loop issue)
          navigateFallbackDenylist: [/^\/api/, /^\/socket.io/],

          runtimeCaching: [
            {
              // API Calls: ALWAYS go to the network (No Cache)
              urlPattern: ({ request, url }) =>
                request.destination !== "document" &&
                (url.pathname.startsWith("/api") || url.hostname.includes("onrender.com")),
              handler: "NetworkOnly",
              options: {
                fetchOptions: {
                  credentials: "include",
                },
              },
            },
            {
              // Socket.io: WebSocket must use network
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/socket.io") ||
                url.hostname.includes("onrender.com"),
              handler: "NetworkOnly",
            },
            {
              // External Images (Cloudinary/Maps/Icons): Cache these for speed
              urlPattern: ({ url }) =>
                url.href.includes("cloudinary") ||
                url.href.includes("cartocdn") ||
                url.href.includes("flaticon"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "external-assets",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
                },
              },
            },
          ],
        },
        // 📱 MANIFEST: App Identity
        manifest: {
          name: "SwadKart - Taste Delivered",
          short_name: "SwadKart",
          description: "Order premium food online with SwadKart Pro",
          theme_color: "#ff6b6b", // Neon Red (Signature Color)
          background_color: "#030712", // Pure Black (Dark Mode)
          display: "standalone",
          orientation: "portrait",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    // ⚡ SPEED OPTIMIZATION: Default Vite Chunking
    build: {
      chunkSizeWarningLimit: 2000,
    },
    // 🌐 DEV SERVER
    server: {
      port: 5173,
      host: isDev, // Listen on all IPs only in dev
      https: false, // HTTP for local dev (avoids SSL cert issues with ServiceWorker + cookies)
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: "http://localhost:8000",
          ws: true,
        },
      },
    },
  };
});
