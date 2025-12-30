import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import {
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingBag,
  Utensils,
  Truck,
  Phone,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { BASE_URL } from "../config";

// 🔌 Socket Connection
const socket = io(BASE_URL, { withCredentials: true });

const OrderDetails = () => {
  const { id } = useParams();
  const { userInfo } = useSelector((state) => state.user);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statusSteps = [
    "Placed",
    "Cooking",
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
        if (!res.ok) throw new Error("Order not found");
        const data = await res.json();
        setOrder(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (userInfo) {
      fetchOrder();
      socket.emit("joinOrder", id);
      socket.on("orderUpdated", (updatedOrder) => {
        setOrder(updatedOrder);
      });
    }

    return () => {
      socket.off("orderUpdated");
    };
  }, [id, userInfo]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">
          Syncing Order Status...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-black text-red-500 flex flex-col justify-center items-center gap-4 p-6 text-center">
        <XCircle size={60} />
        <h2 className="text-2xl font-black uppercase">{error}</h2>
        <Link
          to="/myorders"
          className="text-primary hover:underline font-bold tracking-widest uppercase text-sm"
        >
          Return to Orders
        </Link>
      </div>
    );

  const currentStatusIndex = statusSteps.indexOf(order?.orderStatus);

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Back & Header */}
        <Link
          to="/myorders"
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back to History
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
              Order{" "}
              <span className="text-primary">
                #{order._id.substring(order._id.length - 8)}
              </span>
            </h1>
            <p className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-widest">
              <Calendar size={14} className="text-primary" /> Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div
            className={`px-6 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${
              order.isPaid
                ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10"
                : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10"
            }`}
          >
            {order.isPaid ? "Payment Secured" : "Payment Pending"}
          </div>
        </div>

        {/* 🛵 LIVE TRACKING STEPPER */}
        <div className="bg-gray-950 p-10 rounded-[3rem] border border-gray-900 mb-12 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              return (
                <div
                  key={step}
                  className="flex flex-col items-center z-10 flex-1 w-full md:w-auto"
                >
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-700 border-2 ${
                      isCompleted
                        ? "bg-primary border-primary shadow-[0_0_25px_rgba(239,68,68,0.4)] text-white"
                        : "bg-gray-900 border-gray-800 text-gray-700"
                    } ${isCurrent ? "animate-pulse scale-110" : ""}`}
                  >
                    {index === 0 && <ShoppingBag size={24} />}
                    {index === 1 && <Utensils size={24} />}
                    {index === 2 && <CheckCircle size={24} />}
                    {index === 3 && <Truck size={24} />}
                    {index === 4 && <MapPin size={24} />}
                  </div>
                  <p
                    className={`mt-4 font-black uppercase tracking-tighter text-sm italic ${
                      isCompleted ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {step}
                  </p>
                  {isCurrent && (
                    <span className="mt-1 text-[9px] font-black text-primary animate-bounce uppercase tracking-widest">
                      Live Tracking...
                    </span>
                  )}
                </div>
              );
            })}
            {/* Background Animated Progress Line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-[2px] bg-gray-900 -z-0 rounded-full mx-10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{
                  width: `${
                    (currentStatusIndex / (statusSteps.length - 1)) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: Shipping & Items */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900">
              <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full"></div> Shipping
                Address
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-black/40 rounded-2xl border border-gray-900">
                  <MapPin className="text-primary shrink-0" size={24} />
                  <div>
                    <p className="text-white font-black uppercase tracking-tight text-sm mb-1">
                      {order.shippingAddress.fullName || order.user.name}
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed font-medium">
                      {order.shippingAddress.address},{" "}
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-primary font-mono text-xs mt-3 flex items-center gap-2">
                      <Phone size={12} /> {order.shippingAddress.phone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900">
              <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full"></div> Order
                Items
              </h2>
              <div className="space-y-4">
                {order.orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-black/40 rounded-3xl border border-gray-900 group hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-2xl border border-gray-800"
                      />
                      <div>
                        <p className="text-white font-black uppercase text-xs tracking-tight">
                          {item.name}
                        </p>

                        {/* 👇👇 NEW: SHOW VARIANTS & ADDONS 👇👇 */}
                        <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                          {item.selectedVariant && (
                            <p className="text-primary font-bold">
                              Size: {item.selectedVariant.name}
                            </p>
                          )}
                          {item.selectedAddons &&
                            item.selectedAddons.length > 0 && (
                              <p className="text-gray-500">
                                Extras:{" "}
                                {item.selectedAddons
                                  .map((a) => a.name)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                        {/* 👆👆 END NEW CODE 👆👆 */}

                        <p className="text-gray-500 text-[10px] font-bold mt-1 uppercase italic tracking-widest">
                          {item.qty} units × ₹{item.price}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black italic text-lg tracking-tighter">
                        ₹{item.qty * item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Bill Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900 sticky top-24 shadow-2xl">
              <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6 border-b border-gray-900 pb-4">
                Payment Summary
              </h2>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-500 text-xs font-black uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">₹{order.itemsPrice}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs font-black uppercase tracking-widest">
                  <span>Delivery Fee</span>
                  <span className="text-white">₹{order.shippingPrice}</span>
                </div>

                {/* 👇 Show Discount */}
                {order.couponDiscount > 0 && (
                  <div className="flex justify-between text-green-500 text-xs font-black uppercase tracking-widest">
                    <span>Discount ({order.couponCode})</span>
                    <span>- ₹{order.couponDiscount}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-900 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                    Grand Total
                  </span>
                  <span className="text-3xl font-black italic text-white tracking-tighter">
                    ₹{order.totalPrice}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <p className="text-[10px] font-black text-primary uppercase text-center tracking-widest">
                  Method: {order.paymentMethod}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
