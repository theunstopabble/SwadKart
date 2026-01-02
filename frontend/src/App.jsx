import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";
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

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";

// Helpers
import { BASE_URL } from "./config";
import {
  requestNotificationPermission,
  sendNotification,
} from "./components/notificationHelper"; // ✅ Fixed Import Path

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

  // 🔔 Push Notification & Global Socket Logic
  useEffect(() => {
    // 1. Request Permission on App Load
    requestNotificationPermission();

    const socket = io(BASE_URL);

    if (userInfo) {
      // 2. Join a private room for this user to receive personal updates
      socket.emit("joinOrder", userInfo._id);

      // 3. Global Listener for Order Status Updates
      socket.on("orderUpdated", (order) => {
        // Browser Push Notification
        sendNotification(`SwadKart: Order Update! 🛵`, {
          body: `आपका ऑर्डर #${order._id.slice(-6).toUpperCase()} अब "${
            order.orderStatus
          }" है।`,
        });

        // Audible Alert
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((e) => console.log("Audio alert blocked by browser"));
      });
    }

    // 4. Cleanup on Unmount
    return () => {
      socket.off("orderUpdated");
      socket.disconnect();
    };
  }, [userInfo]);

  return (
    <>
      <ScrollToTop />
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

      <Navbar />

      <main className="min-h-screen">
        <Routes>
          {/* ============================== */}
          {/* 🌍 PUBLIC ROUTES */}
          {/* ============================== */}
          <Route path="/" element={<Home />} />
          <Route path="/restaurant/:id" element={<RestaurantMenu />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/password/reset/:token" element={<ResetPassword />} />

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

      <Footer />
      <ChatBot />
    </>
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
