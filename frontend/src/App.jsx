import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
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
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot"; // 👈 1. NEW IMPORT (AI GENIE)

// 👇 React Toastify Imports
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <>
      {/* 1. Purana Alert System */}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* 2. Naya Alert System */}
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurant/:id" element={<RestaurantMenu />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/placeorder" element={<PlaceOrder />} />
        <Route path="/order/:id" element={<OrderDetails />} />
        <Route path="/myorders" element={<MyOrders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password/reset/:token" element={<ResetPassword />} />

        {/* Role Based Dashboards */}
        <Route
          path="/restaurant-dashboard"
          element={<RestaurantOwnerDashboard />}
        />

        <Route
          path="/delivery-dashboard"
          element={<DeliveryPartnerDashboard />}
        />

        {/* Support for Email Link Route */}
        <Route
          path="/delivery/dashboard"
          element={<DeliveryPartnerDashboard />}
        />
      </Routes>

      <Footer />

      {/* 🧞‍♂️ 3. AI CHATBOT ADDED HERE (Global Floating Button) */}
      <ChatBot />
    </>
  );
}

export default App;
