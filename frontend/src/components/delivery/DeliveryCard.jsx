import React from "react";
import {
  MapPin,
  Phone,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";

const DeliveryCard = ({ order, onAction, onVerify, otpValue, setOtpValue }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 hover:border-primary/50 transition-all shadow-xl group relative overflow-hidden">
      {/* Background Pulse for Active Orders */}
      {order.deliveryStatus === "Accepted" && (
        <div className="absolute top-0 right-0 w-2 h-full bg-green-500 animate-pulse"></div>
      )}

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
          <a
            href={`tel:${order.shippingAddress?.phone}`}
            className="text-xs font-black text-white hover:text-primary transition-colors"
          >
            {order.shippingAddress?.phone}
          </a>
        </div>
      </div>

      {/* Footer: Amount & Action */}
      <div className="pt-6 border-t border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
              Collect / Value
            </p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              ₹{order.totalPrice}
              <span className="text-[10px] text-gray-500 not-italic ml-2 font-bold bg-gray-800 px-2 py-0.5 rounded">
                {order.paymentMethod}
              </span>
            </p>
          </div>
        </div>

        {/* ⚡ ACTION ZONE */}
        {order.deliveryStatus === "Assigned" ? (
          // SCENARIO 1: Driver needs to Accept/Reject
          <div className="flex gap-2">
            <button
              onClick={() => onAction(order._id, "reject")}
              className="flex-1 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all"
            >
              Reject
            </button>
            <button
              onClick={() => onAction(order._id, "accept")}
              className="flex-[2] px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-primary/20"
            >
              Accept Mission <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          // SCENARIO 2: Driver Accepted -> Enter OTP to Deliver
          <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] text-primary font-black uppercase tracking-widest text-center animate-pulse">
              ● Arrived at Location
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Enter 4-Digit OTP"
                className="flex-1 bg-black border border-gray-700 text-white text-center rounded-xl p-3 font-black tracking-[0.3em] outline-none focus:border-primary"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                maxLength={4}
              />
              <button
                onClick={() => onVerify(order._id)}
                className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-green-600/20"
              >
                <CheckCircle size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryCard;
