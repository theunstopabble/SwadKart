import React from "react";
import {
 MapPin,
 Phone,
 Package,
 ArrowRight,
 Clock,
 CheckCircle,
 Navigation,
} from "lucide-react";

const DeliveryCard = ({ order, onAction }) => {
 return (
 <div className="bg-gray-900 border border-gray-800 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 hover:border-primary/50 transition-all shadow-xl group relative overflow-hidden">
 {/* Background Pulse for Active Orders */}
 {order.deliveryStatus === "Accepted" && (
 <div className="absolute top-0 right-0 w-2 h-full bg-green-500 animate-pulse"></div>
 )}

 {/* Header: Order ID & Status */}
 <div className="flex justify-between items-start gap-2 mb-4 sm:mb-6">
 <div className="min-w-0">
 <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5 sm:mb-1">
 Order ID
 </p>
 <h3 className="text-base sm:text-lg font-black text-white tracking-tighter uppercase truncate">
 #{order._id ? order._id.slice(-6) : "------"}
 </h3>
 </div>
  {/* Status badge — field is deliveryStatus (not status); values: Assigned, Accepted, Rejected, Out for Delivery, Delivered */}
  <div
  className={`shrink-0 px-3 sm:px-4 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${
  order.deliveryStatus === "Assigned"
  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse"
  : order.deliveryStatus === "Accepted"
  ? "bg-green-500/10 text-green-500 border-green-500/20"
  : order.deliveryStatus === "Rejected"
  ? "bg-red-500/10 text-red-500 border-red-500/20"
  : order.deliveryStatus === "Delivered"
  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
  : "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }`}
  >
  {order.deliveryStatus}
  </div>
 </div>

 {/* Customer Info */}
 <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
 <div className="flex items-start gap-2 sm:gap-3">
 <div className="p-1.5 sm:p-2 bg-gray-800 rounded-lg sm:rounded-xl text-primary shrink-0">
 <MapPin size={14} className="sm:size-[18]" />
 </div>
 <div className="min-w-0">
 <p className="text-[11px] sm:text-xs font-black text-white uppercase truncate">
 {order.shippingAddress?.fullName}
 </p>
 <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold leading-relaxed line-clamp-2">
 {order.shippingAddress?.address}, {order.shippingAddress?.city}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 sm:gap-3">
 <div className="p-1.5 sm:p-2 bg-gray-800 rounded-lg sm:rounded-xl text-primary shrink-0">
 <Phone size={12} className="sm:size-[16]" />
 </div>
 <a
 href={`tel:${order.shippingAddress?.phone}`}
 className="text-[11px] sm:text-xs font-black text-white hover:text-primary transition-colors truncate"
 >
 {order.shippingAddress?.phone}
 </a>
 </div>
 </div>

 {/* Footer: Amount & Action */}
 <div className="pt-4 sm:pt-6 border-t border-gray-800">
 <div className="flex justify-between items-center mb-3 sm:mb-4">
 <div>
 <p className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-widest">
 Collect / Value
 </p>
 <p className="text-lg sm:text-xl font-black text-white tracking-tighter flex items-center gap-2 flex-wrap">
 ₹{order.totalPrice || 0}
 <span className="text-[8px] sm:text-[10px] text-gray-500 not-italic font-bold bg-gray-800 px-1.5 sm:px-2 py-0.5 rounded">
 {order.paymentMethod || "—"}
 </span>
 </p>
 </div>
 </div>

 {/* ⚡ ACTION ZONE — Only Accept/Reject for Assigned status */}
 {/* OTP verification is handled by the parent OTPSection component */}
 {order.deliveryStatus === "Assigned" ? (
 <div className="flex gap-2">
 <button
 onClick={() => onAction(order._id, "reject")}
 className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-500/10 text-red-500 rounded-xl font-black text-[9px] sm:text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all"
 >
 Reject
 </button>
 <button
 onClick={() => onAction(order._id, "accept")}
 className="flex-[2] px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-1 sm:gap-2 hover:bg-red-600 transition-all shadow-lg shadow-primary/20"
 >
 Accept <span className="hidden sm:inline">Mission</span> <ArrowRight size={12} className="sm:size-[14]" />
 </button>
 </div>
 ) : (
 <div className="space-y-2 sm:space-y-3 bg-green-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-green-500/20">
 <p className="text-[9px] sm:text-[10px] text-green-400 font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 sm:gap-2">
 <Navigation size={12} className="sm:size-[14] animate-pulse shrink-0" /> En Route
 </p>
 <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold text-center uppercase tracking-widest">
 Collect OTP from customer upon arrival
 </p>
 </div>
 )}
 </div>
 </div>
 );
};

export default DeliveryCard;
