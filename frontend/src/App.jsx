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
// ... (skip lines 126-146)
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
