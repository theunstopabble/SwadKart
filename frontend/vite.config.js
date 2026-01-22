import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      devOptions: {
        enabled: true, // Development me bhi PWA test karne ke liye
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
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
          {
            // Socket.io: WebSocket must use network
            urlPattern: ({ url }) => url.pathname.startsWith("/socket.io"),
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
  // ⚡ SPEED OPTIMIZATION: Manual Chunking for Smaller JS Files
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  // 🌐 DEV SERVER: API Proxy to Backend (Only for Localhost)
  server: {
    port: 5173,
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
});
