import React, { useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";

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
import Contact from "./pages/Contact"; // ✅ Contact Page Import

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
import InstallPWA from "./components/InstallPWA";

// Helpers
import { BASE_URL } from "./config";
import {
  requestNotificationPermission,
  sendNotification,
} from "./components/notificationHelper";

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
  const location = useLocation();

  // 🔔 Push Notification & Global Socket Logic
  useEffect(() => {
    requestNotificationPermission();

    const socket = io(BASE_URL);

    if (userInfo) {
      // Join private room
      socket.emit("joinOrder", userInfo._id);

      // Listen for updates
      socket.on("orderUpdated", (order) => {
        sendNotification(`SwadKart: Order Update! 🛵`, {
          body: `Your Order #${order._id.slice(-6).toUpperCase()} is now "${
            order.orderStatus
          }".`,
        });

        // Audible Alert
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((e) => console.log("Audio alert blocked by browser"));
      });
    }

    return () => {
      socket.off("orderUpdated");
      socket.disconnect();
    };
  }, [userInfo]);

  // Hide Navbar/Footer on Dashboards
  const hideLayout =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/restaurant/dashboard") ||
    location.pathname.startsWith("/delivery/dashboard");

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

      {/* ✅ Navbar shows everywhere except dashboards */}
      {!hideLayout && <Navbar />}

      <main className="flex-grow">
        <Routes>
          {/* ============================== */}
          {/* 🌍 PUBLIC ROUTES */}
          {/* ============================== */}
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Home />} />
          <Route path="/restaurant/:id" element={<RestaurantMenu />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/password/forgot" element={<ForgotPassword />} />
          <Route path="/password/reset/:token" element={<ResetPassword />} />

          {/* ✅ Contact Route Added */}
          <Route path="/contact" element={<Contact />} />

          {/* Dynamic Info Pages */}
          <Route path="/page/:type" element={<InfoPage />} />

          {/* ============================== */}
          {/* 🔒 USER PROTECTED ROUTES */}
          {/* ============================== */}
          <Route element={<PrivateRoute />}>
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/placeorder" element={<PlaceOrder />} />
            <Route path="/order/:id" element={<OrderDetails />} />
            <Route path="/myorders" element={<MyOrders />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* ============================== */}
          {/* 👑 ADMIN ROUTES */}
          {/* ============================== */}
          <Route path="/admin/dashboard" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* ============================== */}
          {/* 🏪 RESTAURANT OWNER ROUTES */}
          {/* ============================== */}
          <Route element={<RestaurantRoute />}>
            <Route
              path="/restaurant-dashboard"
              element={<RestaurantOwnerDashboard />}
            />
            <Route
              path="/restaurant/dashboard"
              element={<RestaurantOwnerDashboard />}
            />
          </Route>

          {/* ============================== */}
          {/* 🛵 DELIVERY PARTNER ROUTES */}
          {/* ============================== */}
          <Route element={<DeliveryRoute />}>
            <Route
              path="/delivery-dashboard"
              element={<DeliveryPartnerDashboard />}
            />
            <Route
              path="/delivery/dashboard"
              element={<DeliveryPartnerDashboard />}
            />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ✅ Footer shows everywhere except dashboards */}
      {!hideLayout && <Footer />}

      {/* AI Chatbot */}
      {!hideLayout && <ChatBot />}
    </div>
  );
}

// ==========================================
// 🛡️ ROUTE GUARDS (Security Logic)
// ==========================================

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
    (userInfo.role === "delivery" ||
      userInfo.role === "delivery_partner" ||
      userInfo.role === "admin");
  return isAllowed ? <Outlet /> : <Navigate to="/login" replace />;
};

export default App;
