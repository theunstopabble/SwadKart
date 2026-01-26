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
    // 👇👇 YAHAN HAI JASOOS (DEBUG LOGS) 👇👇
    console.log("====================================");
    console.log("🕵️‍♂️ ASLI BASE_URL KYA HAI?? ->", BASE_URL);
    console.log("🌍 VITE ENV VALUE ->", import.meta.env.VITE_API_URL);
    console.log("====================================");

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

  // 🛑 LOCK SCREEN OVERLAY (Returns early if locked)
  if (isLocked) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent"></div>

        <div className="z-10 flex flex-col items-center gap-6 animate-fade-in-up">
          <div className="p-4 bg-gray-900 rounded-full border border-gray-800 shadow-2xl mb-2">
            <Lock size={40} className="text-gray-400" />
          </div>

          <h1 className="text-3xl font-black italic tracking-tighter">
            Swad<span className="text-primary">Kart</span> Locked
          </h1>

          <p className="text-gray-500 text-sm mb-4">
            Biometric Security Active
          </p>

          {/* Unlock Button */}
          <button
            onClick={handleUnlock}
            className="flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary cursor-pointer group-hover:bg-primary group-hover:text-black transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <Fingerprint size={40} className="animate-pulse" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary group-hover:text-white mt-2">
              Tap to Unlock
            </span>
          </button>
        </div>

        {/* Emergency Logout */}
        <button
          onClick={handleEmergencyLogout}
          className="absolute bottom-10 text-gray-600 hover:text-white text-xs uppercase font-bold tracking-widest flex items-center gap-2 transition-colors"
        >
          <LogOut size={14} /> Use Password Instead
        </button>

        <Toaster position="top-center" />
      </div>
    );
  }

  // 🚀 MAIN APP RENDER (Normal Flow)
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-white flex flex-col justify-between">
      <ScrollToTop />
      <InstallPWA />

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
