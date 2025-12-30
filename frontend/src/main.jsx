import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
// 👇 Leaflet CSS (Map ko sahi dikhane ke liye zaroori hai)
import "leaflet/dist/leaflet.css";
import { Provider } from "react-redux";
import store from "./redux/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
// 1. StatusBar Import (Capacitor)
import { StatusBar, Style } from "@capacitor/status-bar";

// Tumhari Client ID
// main.jsx mein Client ID ko aise load karein
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// 2. Status Bar Setup (Mobile Specific)
const setupStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: "#030712" });
  } catch (error) {
    console.log("StatusBar handling is skipped on Web.");
  }
};

// Initialize Status Bar
setupStatusBar();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>
);
