import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { Fingerprint, LogOut, Lock } from "lucide-react"; // 👈 Icons

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Shipping from "./pages/Shipping";
import Payment from "./pages/Payment";
import PlaceOrder from "./pages/PlaceOrder";
import OrderDetails from "./pages/OrderDetails";
import MyOrders from "./pages/MyOrders";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantOwnerDashboard from "./pages/RestaurantOwnerDashboard";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import InfoPage from "./pages/InfoPage";
import Contact from "./pages/Contact";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
import InstallPWA from "./components/InstallPWA";

// Helpers & Services
import { BASE_URL } from "./config";
import {
  requestNotificationPermission,
  sendNotification,
} from "./components/notificationHelper";
import { authenticateBiometric } from "./utils/biometricService"; // 👈 Biometric Service
import { logout } from "./redux/userSlice"; // 👈 Logout Action for Emergency

// ✨ ScrollToTop Helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // 🔒 BIOMETRIC LOCK STATE (Industry Standard)
  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricCapable, setIsBiometricCapable] = useState(false);
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  // 🔍 Check device capability and lock status on mount
  useEffect(() => {
    const checkLockStatus = async () => {
      // 1. Check device capability first
      let deviceSupported = false;
      if (window.PublicKeyCredential) {
        try {
          deviceSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
          deviceSupported = false;
        }
      }
      setIsBiometricCapable(deviceSupported);

      // 2. Only lock if device supports AND localStorage flag is true AND user is logged in
      const bioEnabled = localStorage.getItem("isBiometricEnabled") === "true";
      if (deviceSupported && bioEnabled && userInfo) {
        setIsLocked(true);
      }
    };

    checkLockStatus();
  }, [userInfo]);

  useEffect(() => {
    // 👇👇 YAHAN HAI JASOOS (DEBUG LOGS) REMOVED 👇👇
    // console.log("🕵️‍♂️ ASLI BASE_URL KYA HAI?? ->", BASE_URL);
    // console.log("🌍 VITE ENV VALUE ->", import.meta.env.VITE_API_URL);

    requestNotificationPermission();
    const socket = io(BASE_URL);

    if (userInfo) {
      socket.emit("joinOrder", userInfo._id);
      socket.on("orderUpdated", (order) => {
        sendNotification(`SwadKart: Order Update! 🛵`, {
          body: `Your Order #${order._id.slice(-6).toUpperCase()} is now "${
            order.orderStatus
          }".`,
        });
        const audio = new Audio("/notification.mp3");
        audio.play().catch((e) => console.log("Audio alert blocked"));
      });
    }

    return () => {
      socket.off("orderUpdated");
      socket.disconnect();
    };
  }, [userInfo]);

  // 🔓 HANDLER: Unlock App (with retry counter)
  const handleUnlock = async () => {
    try {
      const success = await authenticateBiometric();
      if (success) {
        setIsLocked(false);
        setUnlockAttempts(0);
        toast.success("Welcome back! 🔓", { duration: 2000 }); // ⚡ Faster dismiss
      }
    } catch (error) {
      const newAttempts = unlockAttempts + 1;
      setUnlockAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        toast.error("Too many failed attempts. Please login with password.");
        handleEmergencyLogout();
      } else {
        toast.error(`Biometric Failed. ${MAX_ATTEMPTS - newAttempts} attempts left.`);
      }
    }
  };

  // 🚪 HANDLER: Emergency Logout (If user gets stuck or max attempts reached)
  const handleEmergencyLogout = () => {
    localStorage.removeItem("isBiometricEnabled");
    dispatch(logout());
    setIsLocked(false);
    setUnlockAttempts(0);
    toast("Logged out via Secure Lock", { icon: "🛡️" });
  };

  // 🚀 MAIN APP RENDER & LOCK SCREEN HANDLER
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-white flex flex-col justify-between">
      <ScrollToTop />
      <InstallPWA />

      {/* 🔔 GLOBAL TOASTER (Handles both Locked & Unlocked states) */}
      <Toaster
        position="top-center"
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

      {/* 🛑 LOCK SCREEN OVERLAY */}
      {isLocked ? (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white overflow-hidden">
          {/* 🎨 Background Image with Blur */}
          <div 
            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center blur-sm scale-110"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop')" }}
          ></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

          {/* 💎 Glass Card */}
          <div className="z-10 relative bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in-up max-w-sm w-full mx-4">
            
            {/* Logo/Icon */}
            <div className="p-4 bg-primary/20 rounded-full ring-1 ring-primary/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] mb-2">
               <Lock size={32} className="text-primary" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-3xl font-black italic tracking-tighter">
                Swad<span className="text-primary">Kart</span>
              </h1>
              <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-medium">
                Security Active
              </p>
            </div>

            {/* Visual Separator */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>

            {/* Unlock Button */}
            <button
              onClick={handleUnlock}
              className="flex flex-col items-center justify-center gap-4 group w-full"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse group-hover:bg-primary/40 transition-all"></div>
                <div className="w-24 h-24 rounded-full bg-black/50 border border-primary/30 flex items-center justify-center relative z-10 group-active:scale-95 transition-transform duration-200">
                   <Fingerprint size={48} className="text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-300 group-hover:text-white transition-colors">
                Tap to Authentication
              </span>
            </button>
          </div>

          {/* Emergency Logout */}
          <button
            onClick={handleEmergencyLogout}
            className="absolute bottom-10 z-20 text-gray-500 hover:text-white text-xs uppercase font-bold tracking-widest flex items-center gap-2 transition-all hover:bg-white/5 px-4 py-2 rounded-full"
          >
            <LogOut size={14} /> Use Password Instead
          </button>
        </div>
      ) : (
        /* 🚀 NORMAL APP CONTENT */
        <>
          {/* ✅ FIXED: Navbar ab har page par dikhega */}
          <Navbar />

          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Home />} />
              <Route path="/restaurant/:id" element={<RestaurantMenu />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/password/forgot" element={<ForgotPassword />} />
              <Route path="/password/reset/:token" element={<ResetPassword />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/page/:type" element={<InfoPage />} />

              {/* User Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/shipping" element={<Shipping />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/placeorder" element={<PlaceOrder />} />
                <Route path="/order/:id" element={<OrderDetails />} />
                <Route path="/myorders" element={<MyOrders />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminRoute />}>
                <Route index element={<AdminDashboard />} />
              </Route>

              {/* Restaurant Owner Routes */}
              <Route element={<RestaurantRoute />}>
                <Route
                  path="/restaurant/dashboard"
                  element={<RestaurantOwnerDashboard />}
                />
                <Route
                  path="/restaurant-dashboard"
                  element={<RestaurantOwnerDashboard />}
                />
              </Route>

              {/* Delivery Partner Routes */}
              <Route element={<DeliveryRoute />}>
                <Route
                  path="/delivery/dashboard"
                  element={<DeliveryPartnerDashboard />}
                />
                <Route
                  path="/delivery-dashboard"
                  element={<DeliveryPartnerDashboard />}
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* ✅ FIXED: Footer aur Chatbot ab Admin Panel me bhi dikhenge */}
          <Footer />
          <ChatBot />
        </>
      )}
    </div>
  );
}

// 🛡️ ROUTE GUARDS
const PrivateRoute = () => {
  const { userInfo } = useSelector((state) => state.user);
  return userInfo ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const { userInfo } = useSelector((state) => state.user);
  return userInfo && userInfo.role === "admin" ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
};

const RestaurantRoute = () => {
  const { userInfo } = useSelector((state) => state.user);
  const isAllowed =
    userInfo &&
    (userInfo.role === "restaurant_owner" || userInfo.role === "admin");
  return isAllowed ? <Outlet /> : <Navigate to="/login" replace />;
};

const DeliveryRoute = () => {
  const { userInfo } = useSelector((state) => state.user);
  const isAllowed =
    userInfo &&
    (userInfo.role === "delivery_partner" || userInfo.role === "admin");

  return isAllowed ? <Outlet /> : <Navigate to="/login" replace />;
};

export default App;
