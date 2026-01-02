import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import {
  ShoppingBag, // ✅ Added missing import
  MapPin,
  XCircle,
  Phone,
  ArrowLeft,
  Calendar,
  Lock,
  Star,
  CheckCircle,
  Clock,
  Loader2,
  UtensilsCrossed,
  ShieldCheck,
  Wallet,
  Truck,
} from "lucide-react";
import { BASE_URL } from "../config";
import OrderProgress from "../components/order/OrderProgress";
import OrderItemList from "../components/order/OrderItemList";
import ReviewModal from "../components/ReviewModal";
import { toast } from "react-hot-toast";

const socket = io(BASE_URL);

const OrderDetails = () => {
  const { id } = useParams();
  const { userInfo } = useSelector((state) => state.user);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const statusSteps = [
    "Placed",
    "Preparing",
    "Ready",
    "Out for Delivery",
    "Delivered",
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/orders/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else {
          toast.error(data.message || "Order not found");
        }
      } catch (err) {
        toast.error("Network error fetching order details");
      } finally {
        setLoading(false);
      }
    };

    if (userInfo) {
      fetchOrder();

      // 📡 Join Socket Room for Live Updates
      socket.emit("joinOrder", id);

      socket.on("orderUpdated", (updatedOrder) => {
        if (updatedOrder._id === id) {
          setOrder(updatedOrder);
          toast.success(`Order Status: ${updatedOrder.orderStatus}`, {
            icon: "🛵",
          });
        }
      });
    }

    return () => {
      socket.off("orderUpdated");
    };
  }, [id, userInfo]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">
          Tracking Live Order...
        </p>
      </div>
    );

  if (!order)
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center gap-6">
        <XCircle size={64} className="text-red-500 opacity-20" />
        <h2 className="text-2xl font-black uppercase italic">Order Missing</h2>
        <Link
          to="/myorders"
          className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
        >
          Back to History
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-10 pb-20 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Back Navigation */}
        <Link
          to="/myorders"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-all mb-8 text-[10px] font-black uppercase tracking-[0.2em] group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />{" "}
          Back to Orders
        </Link>

        {/* 🏆 Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                #{order._id.slice(-8).toUpperCase()}
              </span>
              {order.isPaid && (
                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle size={10} /> Payment Verified
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
              Track <span className="text-primary">Meal</span>
            </h1>
            <p className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] pt-1">
              <Calendar size={14} className="text-primary" /> Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Current Status
            </span>
            <div className="bg-gray-900 border border-gray-800 px-8 py-3 rounded-2xl text-lg font-black italic text-white shadow-xl">
              {order.orderStatus}
            </div>
          </div>
        </div>

        {/* 🛵 Modern Progress Tracker */}
        <div className="mb-16">
          <OrderProgress
            currentStatus={order.orderStatus}
            statusSteps={statusSteps}
          />
        </div>

        {/* 🔐 OTP Section: Safe Delivery Protocol */}
        {order.orderStatus !== "Delivered" &&
          order.orderStatus !== "Cancelled" &&
          order.deliveryOTP && (
            <div className="max-w-2xl mx-auto bg-gray-950 border-2 border-primary/30 p-10 rounded-[3rem] mb-16 text-center relative overflow-hidden group shadow-[0_0_50px_rgba(225,29,72,0.15)] animate-in zoom-in duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              <Lock size={32} className="mx-auto text-primary mb-4" />
              <h3 className="text-white font-black uppercase italic tracking-widest text-xl mb-2">
                Secure Handshake OTP
              </h3>
              <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[9px] mb-8">
                Share this with the driver only at the time of delivery
              </p>

              <div className="flex justify-center gap-4">
                {order.deliveryOTP
                  .toString()
                  .split("")
                  .map((digit, i) => (
                    <div
                      key={i}
                      className="w-16 h-20 bg-black border border-gray-800 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-inner"
                    >
                      {digit}
                    </div>
                  ))}
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* LEFT COLUMN: Info & Items */}
          <div className="lg:col-span-2 space-y-12">
            {/* Delivery Details Card */}
            <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                <MapPin size={16} className="text-primary" /> Recipient Details
              </h2>
              <div className="space-y-4">
                <div className="bg-black/40 p-6 rounded-3xl border border-gray-900 group-hover:bg-black/60 transition-all">
                  <p className="font-black text-xl uppercase italic tracking-tight text-white mb-1">
                    {order.shippingAddress.fullName}
                  </p>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                    {order.shippingAddress.address},{" "}
                    {order.shippingAddress.city}
                  </p>
                  <div className="h-[1px] bg-gray-900 my-4"></div>
                  <a
                    href={`tel:${order.shippingAddress.phone}`}
                    className="inline-flex items-center gap-3 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all"
                  >
                    <Phone size={14} /> {order.shippingAddress.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-gray-950 p-1 rounded-[2.5rem] border border-gray-900 shadow-2xl overflow-hidden">
              <div className="p-8 pb-4">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                  <ShoppingBag size={16} className="text-primary" /> Your
                  Selection
                </h2>
              </div>
              <OrderItemList items={order.orderItems} />
            </div>

            {/* ⭐ REVIEW TRIGGER: Only if Delivered */}
            {order.orderStatus === "Delivered" && (
              <div className="bg-gradient-to-br from-primary/20 via-gray-950 to-black border border-primary/20 p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 text-center md:text-left">
                  <h3 className="font-black uppercase italic tracking-tighter text-3xl text-white">
                    Rate the <span className="text-primary">Taste!</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-black leading-relaxed max-w-xs">
                    How was the quality and delivery? Your feedback drives our
                    kitchens.
                  </p>
                </div>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="relative z-10 w-full md:w-auto bg-white text-black hover:bg-primary hover:text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl group"
                >
                  <Star
                    size={18}
                    className="group-hover:rotate-180 transition-transform duration-500"
                  />{" "}
                  Write a Review
                </button>
                <UtensilsCrossed
                  className="absolute -right-4 -bottom-4 text-white/5"
                  size={160}
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Financial Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-950 p-10 rounded-[3rem] border border-gray-900 sticky top-28 shadow-2xl space-y-8">
              <h2 className="text-lg font-black italic uppercase tracking-tighter border-b border-gray-900 pb-4">
                Financials
              </h2>

              <div className="space-y-5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <span>Price ({order.orderItems.length} Items)</span>
                  <span className="text-white">₹{order.itemsPrice}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <span>Delivery Charge</span>
                  <span className="text-white">₹{order.shippingPrice}</span>
                </div>
                {order.couponDiscount > 0 && (
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-green-500">
                    <span>Coupon Savings</span>
                    <span>- ₹{order.couponDiscount}</span>
                  </div>
                )}

                <div className="h-[1px] bg-gray-900 my-2"></div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-primary uppercase tracking-widest">
                    Amount Paid
                  </span>
                  <span className="text-4xl font-black italic text-white tracking-tighter">
                    ₹{order.totalPrice}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-black rounded-3xl border border-gray-900 text-center">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">
                  Payment Method
                </p>
                <p className="text-xs font-black text-white uppercase italic tracking-widest mt-1">
                  {order.paymentMethod === "Online"
                    ? "Digital Transaction"
                    : "Cash on Delivery"}
                </p>
              </div>

              <button className="w-full py-4 rounded-2xl border border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-gray-600 transition-all">
                Need Help with Order?
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderItems={order.orderItems}
      />
    </div>
  );
};

export default OrderDetails;
