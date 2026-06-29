import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n.js";
// Leaflet CSS is now imported only in components that use maps (e.g., OrderDetails)
import { Provider } from "react-redux";
import store from "./redux/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast"; // Notifications ke liye
import { Analytics } from "@vercel/analytics/react";
import { HelmetProvider } from "react-helmet-async";
import axios from "axios";

// Google Client ID Load
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// 🛡️ SECURITY FIX: Globally allow HttpOnly cookies cross-origin
axios.defaults.withCredentials = true;
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

function addAuthHeader(headers = {}) {
  if (!headers.Authorization) {
    const token = localStorage.getItem("jwt");
    if (token) {
      return { ...headers, Authorization: `Bearer ${token}` };
    }
  }
  return headers;
}

// 🌐 Global fetch patch: inject X-Requested-With + Bearer token into all backend API calls
const BASEURL = import.meta.env.VITE_API_URL || "";
const origFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : "";
  const isBackendUrl = urlStr.startsWith("/api") || (BASEURL && urlStr.startsWith(BASEURL));

  if (options.method && options.method !== "GET" && isBackendUrl && !urlStr.startsWith("https://nominatim")) {
    const headers = addAuthHeader(options.headers || {});
    if (!headers["X-Requested-With"]) headers["X-Requested-With"] = "XMLHttpRequest";
    options = { ...options, headers };
  }

  // Also inject token for GET requests when credentials: "include" (needed for auth)
  if ((!options.method || options.method === "GET") && isBackendUrl && !urlStr.startsWith("https://nominatim")) {
    const headers = addAuthHeader(options.headers || {});
    options = { ...options, headers };
  }

  return origFetch(url, options);
};

// 🛡️ Inject Bearer token into all axios requests automatically
axios.interceptors.request.use((config) => {
  if (!config.headers?.Authorization) {
    const token = localStorage.getItem("jwt");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <HelmetProvider>
          <BrowserRouter>
            <App />
            <Analytics />
            <Toaster
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#1f2937",
                  color: "#fff",
                  borderRadius: "15px",
                  border: "1px solid #374151",
                },
              }}
            />
          </BrowserRouter>
        </HelmetProvider>
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>,
);
