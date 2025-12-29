import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Provider } from "react-redux";
import store from "./redux/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
// 1. StatusBar Import (Capacitor)
import { StatusBar, Style } from "@capacitor/status-bar";

// Tumhari Client ID
const GOOGLE_CLIENT_ID =
  "681681246850-ji8nu3l06rrljbm1aeba6h79im01jm6n.apps.googleusercontent.com";

// 2. Status Bar Setup (Mobile Specific)
const setupStatusBar = async () => {
  try {
    // Android/iOS par Status Bar ka text Light (White) karega
    await StatusBar.setStyle({ style: Style.Dark });

    // Overlay OFF: App status bar ke niche se shuru hoga (Overlap nahi karega)
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Background Color: Dark Theme (#030712 matches gray-950)
    await StatusBar.setBackgroundColor({ color: "#030712" });
  } catch (error) {
    // Web par ye feature nahi hota, isliye error ignore karein
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
