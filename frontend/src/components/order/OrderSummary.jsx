import { ArrowRight, ReceiptText } from "lucide-react";

const OrderSummary = ({
  itemsPrice,
  taxPrice,
  shippingPrice,
  couponDiscount,
  appliedCouponCode,
  totalPrice,
  isProcessing,
  placeOrderHandler,
}) => (
  <div className="w-full lg:min-w-[380px]">
    <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 sticky top-24 shadow-2xl transition-all hover:border-gray-700 overflow-hidden relative">
      {/* Subtle Glow Background Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-5">
        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
          <ReceiptText size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold uppercase italic tracking-tighter text-white leading-none">
            Order <span className="text-primary">Summary</span>
          </h2>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1.5">
            Final Billing Details
          </p>
        </div>
      </div>

      {/* Pricing Rows */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center group">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
            Items Total
          </span>
          <span className="text-sm font-extrabold text-gray-200 italic">
            ₹{itemsPrice}
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
            Tax Protocol
          </span>
          <span className="text-sm font-extrabold text-gray-200 italic">
            ₹{taxPrice}
          </span>
        </div>

        <div className="flex justify-between items-center group">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
            Shipping
          </span>
          <span
            className={`text-sm font-extrabold italic ${
              shippingPrice === 0 ? "text-green-500" : "text-gray-200"
            }`}
          >
            {shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}
          </span>
        </div>

        {couponDiscount > 0 && (
          <div className="flex justify-between items-center bg-green-500/5 border border-green-500/10 p-3 rounded-xl animate-pulse">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">
              Discount ({appliedCouponCode})
            </span>
            <span className="text-sm font-black text-green-500 italic">
              -₹{couponDiscount}
            </span>
          </div>
        )}
      </div>

      {/* Total Amount Section */}
      <div className="bg-black/40 border border-gray-800 rounded-2xl p-5 mb-8 flex justify-between items-center shadow-inner">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
            Total Payable
          </span>
          <span className="text-gray-400 text-[9px] font-bold">
            Inc. all taxes
          </span>
        </div>
        <span className="text-4xl font-extrabold text-primary italic tracking-tighter drop-shadow-xl">
          ₹{totalPrice}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={placeOrderHandler}
        disabled={isProcessing}
        className="w-full bg-primary hover:bg-red-600 text-white py-5 rounded-xl font-extrabold uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50 disabled:grayscale group"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <>
            Place Order
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1.5 transition-transform"
            />
          </>
        )}
      </button>

      {/* Security Info */}
      <p className="text-center mt-6 text-[8px] text-gray-600 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
        <span className="w-1 h-1 bg-gray-700 rounded-full"></span> Secure
        256-bit Encrypted Checkout{" "}
        <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
      </p>
    </div>
  </div>
);

export default OrderSummary;
