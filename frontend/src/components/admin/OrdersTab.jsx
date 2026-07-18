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
 Trash2,
 Store,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../../config";

const OrdersTab = ({ orders, deliveryPartners, userInfo, fetchAllData }) => {
 // ADMIN-04 FIX: Normalize orders prop — handle both array and paginated object
 const safeOrders = Array.isArray(orders) ? orders : orders?.data || [];

 const [selectedPartner, setSelectedPartner] = useState({});
 const [selectedOrder, setSelectedOrder] = useState(null);
 const [isAssigning, setIsAssigning] = useState(false);

 // Helper for API calls
 const getFetchOptions = (method = "GET", body = null) => {
 const options = {
 method,
 credentials: "include",
 headers: {
 "Content-Type": "application/json",
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
 `${BASEURL}/api/v1/orders/${orderId}/assign`,
 getFetchOptions("PUT", { deliveryPartnerId: partnerId }),
 );
 if (res.ok) {
 toast.success("Pilot assigned to mission! 🚀");
 fetchAllData();
 } else {
 const error = await res.json().catch(() => ({}));
 toast.error(error.message || "Assignment failed");
 }
 } catch {
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
 "Payment Pending": "bg-purple-500/10 text-purple-500 border-purple-500/20",
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
 : order.orderStatus === "Payment Pending"
 ? Clock
 : Clock;

 return (
 <span
 className={`${currentStyle} px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-2 w-fit tracking-widest border`}
 >
 <Icon size={12} /> {order.orderStatus || "Processing"}
 </span>
 );
 };

 return (
 <div className="bg-gray-950 border border-gray-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
 {/* ── DESKTOP TABLE ── */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-gray-900/80 backdrop-blur-md text-gray-500 uppercase font-black text-[10px] tracking-[0.3em] border-b border-gray-800">
 <tr>
 <th className="p-3 sm:p-6 md:p-8">Order Tracker</th>
 <th className="p-3 sm:p-6 md:p-8">Destination</th>
 <th className="p-3 sm:p-6 md:p-8">Bill Value</th>
 <th className="p-3 sm:p-6 md:p-8">Status</th>
 <th className="p-3 sm:p-6 md:p-8">Logistics</th>
 <th className="p-3 sm:p-6 md:p-8 text-center">Preview</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-900/50">
 {safeOrders && safeOrders.length > 0 ? (
 safeOrders.map((o) => (
 <tr
 key={o._id}
 className="hover:bg-primary/5 transition-all group"
 >
 <td className="p-3 sm:p-6 md:p-8">
 <span className="font-mono text-xs text-primary font-black tracking-widest bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
 #{o._id.slice(-6).toUpperCase()}
 </span>
 </td>
 <td className="p-3 sm:p-6 md:p-8">
 <div className="font-black text-white text-sm uppercase tracking-tight group-hover:text-primary transition-colors">
 {o.shippingAddress?.fullName || o.user?.name}
 </div>
 <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2 mt-1 uppercase tracking-widest">
 <MapPin size={10} className="text-primary" />{" "}
 {o.shippingAddress?.city}
 </div>
 </td>
 <td className="p-3 sm:p-6 md:p-8">
 <div className="text-lg font-black text-white tracking-tighter">
 ₹{(o.totalPrice || 0).toLocaleString("en-IN")}
 </div>
 </td>
 <td className="p-3 sm:p-6 md:p-8">{getStatusBadge(o)}</td>
 <td className="p-3 sm:p-6 md:p-8">
 {o.deliveryPartner ? (
 <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 px-4 py-2 rounded-2xl w-fit">
 <div className="h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>
 <span className="text-blue-400 font-black text-[10px] uppercase tracking-widest">
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
 {[...deliveryPartners]
 .sort((a, b) => {
 if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
 return a.name.localeCompare(b.name);
 })
 .map((p) => (
 <option key={p._id} value={p._id}>
 {p.name}{" "}
 {p.isAvailable === false ? "(Busy)" : "(Available)"}
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
 <td className="p-3 sm:p-6 md:p-8">
 <div className="flex justify-center">
 <button
 onClick={() => setSelectedOrder(o)}
 className="p-3 sm:p-4 bg-gray-900 text-gray-500 hover:text-white rounded-[1.2rem] border border-gray-800 hover:border-primary/50 transition-all shadow-xl group/btn"
 >
 <Eye
 size={16}
 className="sm:hidden group-hover/btn:scale-110 transition-transform"
 />
 <Eye
 size={20}
 className="hidden sm:block group-hover/btn:scale-110 transition-transform"
 />
 </button>
 </div>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td
 colSpan="6"
 className="p-8 sm:p-16 text-center text-gray-600 font-black uppercase text-xs tracking-widest"
 >
 No orders found
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* ── MOBILE CARD LAYOUT ── */}
 <div className="md:hidden space-y-4 p-4">
 {safeOrders && safeOrders.length > 0 ? (
 safeOrders.map((o) => (
 <div
 key={o._id}
 className="bg-gray-950 border border-gray-900 rounded-[2rem] p-5 space-y-4 hover:border-gray-800 transition-all"
 >
 {/* Top row: ID + Badge + Preview */}
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-mono text-[10px] text-primary font-black tracking-widest bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
 #{o._id.slice(-6).toUpperCase()}
 </span>
 {getStatusBadge(o)}
 </div>
 <button
 onClick={() => setSelectedOrder(o)}
 className="shrink-0 p-2 bg-gray-900 text-gray-500 hover:text-white rounded-xl border border-gray-800 hover:border-primary/50 transition-all"
 >
 <Eye size={14} className="group-hover/btn:scale-110 transition-transform" />
 </button>
 </div>

 {/* Customer + City */}
 <div>
 <p className="font-black text-white text-sm uppercase tracking-tight">
 {o.shippingAddress?.fullName || o.user?.name}
 </p>
 <p className="text-[10px] text-gray-600 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-widest">
 <MapPin size={10} className="text-primary" />
 {o.shippingAddress?.city || "N/A"}
 </p>
 </div>

 {/* Bottom row: Bill + Assign */}
 <div className="flex items-end justify-between gap-3 pt-2 border-t border-gray-900/50">
 <div>
 <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">
 Bill
 </p>
 <p className="text-lg font-black text-white tracking-tighter">
 ₹{(o.totalPrice || 0).toLocaleString("en-IN")}
 </p>
 </div>
 {o.deliveryPartner ? (
 <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/10 px-3 py-1.5 rounded-xl shrink-0">
 <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping"></div>
 <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">
 {o.deliveryPartner.name}
 </span>
 </div>
 ) : (
 <div className="flex items-center gap-1.5 shrink-0">
 <select
 disabled={isAssigning}
 className="bg-black border border-gray-800 text-gray-400 p-2 rounded-lg text-[9px] font-black outline-none focus:border-primary transition-all uppercase tracking-widest max-w-[120px]"
 onChange={(e) =>
 setSelectedPartner({
 ...selectedPartner,
 [o._id]: e.target.value,
 })
 }
 value={selectedPartner[o._id] || ""}
 >
 <option value="">Driver</option>
 {[...deliveryPartners]
 .sort((a, b) => {
 if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
 return a.name.localeCompare(b.name);
 })
 .map((p) => (
 <option key={p._id} value={p._id}>
 {p.name}
 </option>
 ))}
 </select>
 <button
 onClick={() => handleAssignPartner(o._id)}
 disabled={isAssigning}
 className="bg-primary hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-lg shadow-primary/20 active:scale-90 disabled:opacity-50"
 >
 {isAssigning ? (
 <Loader2 size={12} className="animate-spin" />
 ) : (
 <Truck size={12} />
 )}
 </button>
 </div>
 )}
 </div>
 </div>
 ))
 ) : (
 <div className="p-8 sm:p-16 text-center text-gray-600 font-black uppercase text-xs tracking-widest bg-gray-950 border border-gray-900 rounded-[2rem]">
 No orders found
 </div>
 )}
 </div>

 {/* 📂 PRO ORDER DETAILS MODAL */}
 {selectedOrder && (
 <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex justify-center items-center z-[9999] p-3 sm:p-4 animate-in fade-in duration-300">
 <div className="bg-gray-950 border border-gray-800 w-full max-w-3xl rounded-[2rem] sm:rounded-[3rem] p-3 sm:p-4 md:p-5 relative shadow-[0_0_100px_rgba(255,107,107,0.1)] animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">

 {/* ── HEADER ── */}
 <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
 <div className="flex items-center gap-3 min-w-0">
 <div className="bg-primary/10 p-2 sm:p-2.5 md:p-3 rounded-[1.5rem] text-primary border border-primary/20 shrink-0">
 <ShoppingBag size={18} className="sm:hidden" />
 <ShoppingBag size={22} className="hidden sm:block md:hidden" />
 <ShoppingBag size={28} className="hidden md:block" />
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">
 Order <span className="text-primary">#{selectedOrder._id?.slice(-6).toUpperCase()}</span>
 </h2>
 <div className="hidden xs:inline-block">{getStatusBadge(selectedOrder)}</div>
 </div>
 <div className="flex items-center gap-1.5 mt-1">
 <Calendar size={10} className="text-gray-600 shrink-0" />
 <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-widest">
 {new Date(selectedOrder.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <div className="xs:hidden">{getStatusBadge(selectedOrder)}</div>
 <button
 onClick={() => setSelectedOrder(null)}
 className="text-gray-600 hover:text-white bg-white/5 hover:bg-primary p-1.5 sm:p-2 rounded-xl transition-all"
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* ── GRID: CART (7) + DETAILS (5) ── */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">

 {/* LEFT: Cart Contents */}
 <div className="md:col-span-7 space-y-3">
 <h3 className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-gray-800 pb-2 flex items-center gap-1.5">
 <ShoppingBag size={10} className="text-primary" />
 Cart <span className="text-primary ml-0.5">({selectedOrder.orderItems.length})</span>
 </h3>
 <div className="max-h-44 sm:max-h-52 md:max-h-64 overflow-y-auto pr-1 space-y-2 no-scrollbar">
 {selectedOrder.orderItems.map((item, idx) => (
 <div
 key={idx}
 className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-black rounded-xl border border-gray-900 hover:border-gray-800 transition-colors group/item"
 >
 <div className="relative shrink-0">
 <img
 src={item.image || "images/placeholder.jpg"}
 onError={(e) => { e.target.src = "images/placeholder.jpg"; }}
 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl object-cover grayscale group-hover/item:grayscale-0 transition-all"
 alt={item.name}
 />
 <span className="absolute -top-1 -right-1 bg-primary text-white text-[6px] sm:text-[7px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
 {item.qty}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight truncate">
 {item.name}
 </p>
 <div className="flex flex-wrap gap-0.5 mt-0.5">
 {item.selectedVariant?.name && (
 <span className="text-[5px] sm:text-[6px] font-black bg-blue-500/10 text-blue-400 px-1 sm:px-1.5 py-0.5 rounded uppercase border border-blue-500/20 tracking-widest">
 {item.selectedVariant.name}
 </span>
 )}
 {item.selectedAddons?.map((a, ai) => (
 <span key={ai} className="text-[5px] sm:text-[6px] font-black bg-green-500/10 text-green-400 px-1 sm:px-1.5 py-0.5 rounded uppercase border border-green-500/20 tracking-widest">
 +{a.name}
 </span>
 ))}
 </div>
 <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold mt-0.5">
 ₹{item.price.toLocaleString("en-IN")} × {item.qty}
 </p>
 </div>
 <div className="text-[10px] sm:text-xs md:text-sm font-black text-white shrink-0 tabular-nums">
 ₹{(item.price * item.qty).toLocaleString("en-IN")}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* RIGHT: Details */}
 <div className="md:col-span-5 space-y-2 sm:space-y-3">
 <h3 className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-gray-800 pb-2">
 Details
 </h3>

 {/* Restaurant */}
 <div className="flex items-center gap-2.5 bg-gray-900/40 p-2.5 sm:p-3 md:p-4 rounded-2xl border border-gray-900">
 <div className="bg-primary/10 p-1.5 sm:p-2 rounded-xl text-primary shrink-0">
 <Store size={14} />
 </div>
 <div className="min-w-0">
 <p className="text-[7px] font-black uppercase tracking-widest text-gray-500">Restaurant</p>
 <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight truncate">
 {typeof selectedOrder.orderItems[0]?.restaurant === "object"
 ? selectedOrder.orderItems[0].restaurant.name || "N/A"
 : selectedOrder.orderItems[0]?.restaurant?.toString()?.slice(-6) || "N/A"}
 </p>
 <p className="text-[7px] sm:text-[8px] text-gray-500 font-bold tracking-widest">
 {selectedOrder.orderItems.length} item{selectedOrder.orderItems.length > 1 ? 's' : ''}
 </p>
 </div>
 </div>

 {/* Customer */}
 <div className="flex items-start gap-2.5 bg-gray-900/40 p-2.5 sm:p-3 md:p-4 rounded-2xl border border-gray-900">
 <div className="bg-primary/10 p-1.5 sm:p-2 rounded-xl text-primary shrink-0">
 <User size={14} />
 </div>
 <div className="min-w-0">
 <p className="text-[7px] font-black uppercase tracking-widest text-gray-500">Customer</p>
 <p className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-tight">
 {selectedOrder.shippingAddress?.fullName}
 </p>
 <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold mt-0.5 tracking-widest">
 {selectedOrder.shippingAddress?.phone || "N/A"}
 </p>
 <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold mt-0.5 leading-relaxed">
 {selectedOrder.shippingAddress?.address},{" "}
 {selectedOrder.shippingAddress?.city},{" "}
 {selectedOrder.shippingAddress?.state}{" "}
 {selectedOrder.shippingAddress?.postalCode}
 </p>
 </div>
 </div>

 {/* Payment */}
 <div className={`flex items-center gap-2.5 p-2.5 sm:p-3 md:p-4 rounded-2xl border transition-all ${
 selectedOrder.isPaid
 ? "bg-green-500/5 border-green-500/20"
 : "bg-amber-500/5 border-amber-500/20"
 }`}>
 {selectedOrder.isPaid
 ? <CheckCircle size={15} className="text-green-500 shrink-0" />
 : <Clock size={15} className="text-amber-500 shrink-0" />
 }
 <div>
 <p className="text-[7px] font-black uppercase tracking-widest opacity-60 text-current">Payment</p>
 <p className={`text-[10px] sm:text-[11px] font-black tracking-widest ${
 selectedOrder.isPaid ? "text-green-500" : "text-amber-500"
 }`}>
 {selectedOrder.isPaid ? `Paid via ${selectedOrder.paymentMethod || "Online"}` : "Payment Unpaid"}
 </p>
 </div>
 </div>

 {/* Delivery Partner */}
 <div className={`flex items-center gap-2.5 p-2.5 sm:p-3 md:p-4 rounded-2xl border transition-all ${
 selectedOrder.deliveryPartner
 ? "bg-blue-500/5 border-blue-500/20"
 : "bg-gray-900/40 border-gray-900"
 }`}>
 <Truck size={15} className={`shrink-0 ${
 selectedOrder.deliveryPartner ? "text-blue-500" : "text-gray-600"
 }`} />
 <div>
 <p className="text-[7px] font-black uppercase tracking-widest opacity-60 text-current">Delivery Partner</p>
 <p className={`text-[10px] sm:text-[11px] font-black tracking-widest ${
 selectedOrder.deliveryPartner ? "text-blue-500" : "text-gray-500"
 }`}>
 {selectedOrder.deliveryPartner?.name || "Not Assigned"}
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* ── FOOTER ── */}
 <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-gray-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 <div>
 <span className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-0.5">
 Grand Total
 </span>
 <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter">
 ₹{(selectedOrder.totalPrice ?? 0).toLocaleString("en-IN")}
 </div>
 </div>
 <div className="flex items-center gap-2 w-full sm:w-auto">
 <div className="bg-primary/5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-primary/10 text-primary text-[6px] sm:text-[7px] font-black uppercase tracking-[0.2em] truncate max-w-[140px] sm:max-w-none hidden sm:block">
 TXN #{selectedOrder._id.slice(-12).toUpperCase()}
 </div>
 {userInfo?.role === "admin" && selectedOrder.orderStatus !== "Delivered" && selectedOrder.orderStatus !== "Cancelled" && selectedOrder.orderStatus !== "Out for Delivery" && (
 <button
 onClick={async () => {
 if (!window.confirm(`Cancel order #${selectedOrder._id.slice(-6).toUpperCase()}?`)) return;
 try {
 const res = await fetch(`${BASEURL}/api/v1/orders/${selectedOrder._id}/cancel`, {
 method: "PUT",
 credentials: "include",
 });
 if (res.ok) {
 toast.success("Order cancelled by admin");
 setSelectedOrder(null);
 fetchAllData();
 } else {
 const err = await res.json().catch(() => ({}));
 toast.error(err?.message || "Cancel failed");
 }
 } catch {
 toast.error("Cancel request failed");
 }
 }}
 className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95"
 >
 <Trash2 size={12} />
 Cancel
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default OrdersTab;
