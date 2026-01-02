import React from "react";
import { Tag, X } from "lucide-react";

const CouponSection = ({
  couponCode,
  setCouponCode,
  applyHandler,
  removeHandler,
  availableCoupons = [], // Default to empty array to prevent crashes
  appliedCoupon,
  loading,
  discount,
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* --- Input Field Label --- */}
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
        Have a Secret Coupon?
      </label>

      {/* --- Coupon Input & Apply/Remove Button --- */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Tag
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="ENTER CODE"
            className="w-full bg-black text-white pl-10 pr-10 py-3 rounded-xl border border-gray-800 focus:border-primary outline-none uppercase font-black italic tracking-tighter text-sm transition-all placeholder:text-gray-700"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            disabled={discount > 0} // Disable input if a coupon is already applied
          />

          {/* X Button to remove applied coupon */}
          {discount > 0 && (
            <button
              onClick={removeHandler}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
              title="Remove Coupon"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Apply Button (Visible only when no discount is applied) */}
        {discount === 0 && (
          <button
            onClick={() => applyHandler()} // Calls handler with current input value
            disabled={loading || !couponCode.trim()}
            className="bg-gray-800 hover:bg-white hover:text-black text-white px-6 rounded-xl font-black text-[10px] uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? "..." : "Apply"}
          </button>
        )}
      </div>

      {/* --- Available Coupons List --- */}
      {/* Only show if coupons exist and no coupon is currently applied */}
      {availableCoupons.length > 0 && !appliedCoupon && (
        <div className="bg-black/40 rounded-2xl border border-gray-800 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
            Best Offers for you
          </p>

          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
            {availableCoupons.map((c) => (
              <div
                key={c._id}
                onClick={() => applyHandler(c.code)}
                className="p-3 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-primary/50 cursor-pointer transition-all flex justify-between items-center group active:scale-[0.98]"
              >
                <div>
                  <p className="font-black text-xs text-white group-hover:text-primary transition-colors">
                    {c.code}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                    {c.discountPercentage}% Off up to ₹{c.maxDiscountAmount}
                  </p>
                  {c.minOrderAmount > 0 && (
                    <p className="text-[8px] text-gray-600 mt-0.5">
                      Min Order: ₹{c.minOrderAmount}
                    </p>
                  )}
                </div>

                <div className="text-[8px] font-black bg-green-500/10 text-green-500 px-2 py-1 rounded-full uppercase italic border border-green-500/20">
                  Tap to Apply
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponSection;
