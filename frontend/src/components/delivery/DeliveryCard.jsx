import React from "react";
import { MapPin, Phone, Package, ArrowRight, Clock } from "lucide-react";

const DeliveryCard = ({ order, onAction }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 hover:border-primary/50 transition-all shadow-xl group">
      {/* Header: Order ID & Status */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
            Order ID
          </p>
          <h3 className="text-lg font-black text-white italic tracking-tighter uppercase">
            #{order._id.slice(-6)}
          </h3>
        </div>
        <div
          className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic border ${
            order.deliveryStatus === "Assigned"
              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse"
              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
          }`}
        >
          {order.deliveryStatus}
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-800 rounded-xl text-primary">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase">
              {order.shippingAddress?.fullName}
            </p>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed italic">
              {order.shippingAddress?.address}, {order.shippingAddress?.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800 rounded-xl text-primary font-mono text-xs">
            <Phone size={16} />
          </div>
          <p className="text-xs font-black text-white">
            {order.shippingAddress?.phone}
          </p>
        </div>
      </div>

      {/* Footer: Amount & Action */}
      <div className="pt-6 border-t border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
            Earnings
          </p>
          <p className="text-xl font-black text-white italic tracking-tighter">
            ₹{order.totalPrice}
          </p>
        </div>

        {order.deliveryStatus === "Assigned" ? (
          <div className="flex gap-2">
            <button
              onClick={() => onAction(order._id, "reject")}
              className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all"
            >
              Reject
            </button>
            <button
              onClick={() => onAction(order._id, "accept")}
              className="px-6 py-2 bg-primary text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-primary/20"
            >
              Accept <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction(order._id, "view")}
            className="px-6 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Go to Delivery
          </button>
        )}
      </div>
    </div>
  );
};

export default DeliveryCard; // 👈 This was missing!
