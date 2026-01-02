import React, { useState } from "react";
import {
  CheckCircle,
  Clock,
  Truck,
  Phone,
  User,
  MapPin,
  ShoppingBag,
  Eye,
  X,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../../config";

const OrdersTab = ({ orders, deliveryPartners, userInfo, fetchAllData }) => {
  const [selectedPartner, setSelectedPartner] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Helper for API calls
  const getFetchOptions = (method = "GET", body = null) => {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo?.token}`,
      },
    };
    if (body) options.body = JSON.stringify(body);
    return options;
  };

  // Assign Partner Logic
  const handleAssignPartner = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) return toast.error("Choose a driver first! 🛵");

    try {
      setIsAssigning(true);
      const res = await fetch(
        `${BASE_URL}/api/v1/orders/${orderId}/assign`,
        getFetchOptions("PUT", { deliveryPartnerId: partnerId })
      );
      if (res.ok) {
        toast.success("Pilot assigned to mission! 🚀");
        fetchAllData();
      } else {
        const error = await res.json();
        toast.error(error.message || "Assignment failed");
      }
    } catch (error) {
      toast.error("Network radar lost");
    } finally {
      setIsAssigning(false);
    }
  };

  // Modern Status Badges
  const getStatusBadge = (order) => {
    const styles = {
      Delivered: "bg-green-500/10 text-green-500 border-green-500/20",
      "Out for Delivery":
        "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse",
      Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
      default:
        "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse",
    };

    const currentStyle = styles[order.orderStatus] || styles.default;
    const Icon =
      order.orderStatus === "Delivered"
        ? CheckCircle
        : order.orderStatus === "Out for Delivery"
        ? Truck
        : order.orderStatus === "Cancelled"
        ? X
        : Clock;

    return (
      <span
        className={`${currentStyle} px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-2 w-fit italic tracking-widest border`}
      >
        <Icon size={12} /> {order.orderStatus || "Processing"}
      </span>
    );
  };

  return (
    <div className="bg-gray-950 border border-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-900/80 backdrop-blur-md text-gray-500 uppercase font-black text-[10px] tracking-[0.3em] border-b border-gray-800">
            <tr>
              <th className="p-8">Order Tracker</th>
              <th className="p-8">Destination</th>
              <th className="p-8">Bill Value</th>
              <th className="p-8">Status</th>
              <th className="p-8">Logistics</th>
              <th className="p-8 text-center">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900/50">
            {orders.map((o) => (
              <tr
                key={o._id}
                className="hover:bg-primary/5 transition-all group"
              >
                <td className="p-8">
                  <span className="font-mono text-xs text-primary font-black tracking-widest bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
                    #{o._id.slice(-6).toUpperCase()}
                  </span>
                </td>
                <td className="p-8">
                  <div className="font-black text-white text-sm uppercase italic tracking-tight group-hover:text-primary transition-colors">
                    {o.shippingAddress?.fullName || o.user?.name}
                  </div>
                  <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2 mt-1 uppercase tracking-widest">
                    <MapPin size={10} className="text-primary" />{" "}
                    {o.shippingAddress?.city}
                  </div>
                </td>
                <td className="p-8">
                  <div className="text-lg font-black text-white italic tracking-tighter">
                    ₹{o.totalPrice.toLocaleString("en-IN")}
                  </div>
                </td>
                <td className="p-8">{getStatusBadge(o)}</td>
                <td className="p-8">
                  {o.deliveryPartner ? (
                    <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 px-4 py-2 rounded-2xl w-fit">
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>
                      <span className="text-blue-400 font-black text-[10px] uppercase italic tracking-widest">
                        {o.deliveryPartner.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        disabled={isAssigning}
                        className="bg-black border border-gray-800 text-gray-400 p-2.5 rounded-xl text-[10px] font-black outline-none focus:border-primary transition-all uppercase tracking-widest"
                        onChange={(e) =>
                          setSelectedPartner({
                            ...selectedPartner,
                            [o._id]: e.target.value,
                          })
                        }
                        value={selectedPartner[o._id] || ""}
                      >
                        <option value="">Scan Drivers</option>
                        {deliveryPartners.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignPartner(o._id)}
                        disabled={isAssigning}
                        className="bg-primary hover:bg-red-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-90 disabled:opacity-50"
                      >
                        {isAssigning ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Truck size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </td>
                <td className="p-8">
                  <div className="flex justify-center">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="p-4 bg-gray-900 text-gray-500 hover:text-white rounded-[1.2rem] border border-gray-800 hover:border-primary/50 transition-all shadow-xl group/btn"
                    >
                      <Eye
                        size={20}
                        className="group-hover/btn:scale-110 transition-transform"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📂 PRO ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex justify-center items-center z-[9999] p-6 animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-3xl rounded-[3.5rem] p-10 relative shadow-[0_0_100px_rgba(255,107,107,0.1)] animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-8 right-8 text-gray-600 hover:text-white bg-white/5 hover:bg-primary p-3 rounded-2xl transition-all"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-6 mb-12">
              <div className="bg-primary/10 p-5 rounded-[2rem] text-primary border border-primary/20">
                <ShoppingBag size={40} />
              </div>
              <div>
                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">
                  Review <span className="text-primary">Order</span>
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] bg-gray-900 text-gray-500 font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-gray-800">
                    #{selectedOrder._id.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} />{" "}
                    {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] border-b border-gray-900 pb-3">
                  Cart Contents
                </h3>
                <div className="max-h-60 overflow-y-auto pr-4 space-y-4 no-scrollbar">
                  {selectedOrder.orderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-black rounded-[1.5rem] border border-gray-900 hover:border-gray-800 transition-colors"
                    >
                      <img
                        src={item.image}
                        className="w-16 h-16 rounded-2xl object-cover grayscale hover:grayscale-0 transition-all"
                        alt=""
                      />
                      <div className="flex-1">
                        <p className="text-xs font-black text-white uppercase italic tracking-tight">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-primary font-black mt-1">
                          ₹{item.price}{" "}
                          <span className="text-gray-600 ml-1 font-bold">
                            × {item.qty}
                          </span>
                        </p>
                      </div>
                      <div className="text-sm font-black text-white italic">
                        ₹{item.price * item.qty}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] border-b border-gray-900 pb-3">
                  Destination Details
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 bg-gray-900/40 p-5 rounded-[2rem] border border-gray-900">
                    <div className="bg-primary/10 p-3 rounded-xl text-primary">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tight">
                        {selectedOrder.shippingAddress?.fullName}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 tracking-widest">
                        {selectedOrder.shippingAddress?.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-gray-900/40 p-5 rounded-[2rem] border border-gray-900">
                    <div className="bg-primary/10 p-3 rounded-xl text-primary">
                      <MapPin size={20} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed italic uppercase tracking-tighter">
                      {selectedOrder.shippingAddress?.address},{" "}
                      {selectedOrder.shippingAddress?.city}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${
                      selectedOrder.isPaid
                        ? "bg-green-500/5 border-green-500/20 text-green-500"
                        : "bg-red-500/5 border-red-500/20 text-red-500"
                    }`}
                  >
                    <ShieldCheck size={24} />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                        Revenue Protection
                      </p>
                      <p className="text-xs font-black italic tracking-widest">
                        {selectedOrder.isPaid
                          ? "PAYMENT VERIFIED"
                          : "PAYMENT PENDING"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-900 flex justify-between items-end">
              <div>
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.5em] block mb-2">
                  Grand Total Paid
                </span>
                <div className="text-5xl font-black italic text-white tracking-tighter">
                  ₹{selectedOrder.totalPrice.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 text-primary text-[9px] font-black uppercase tracking-[0.2em] italic">
                Secure Transaction ID: {selectedOrder._id.slice(-12)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
