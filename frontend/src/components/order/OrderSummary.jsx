import { ArrowRight } from "lucide-react";

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
  <div className="lg:w-1/3">
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 sticky top-24">
      <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-4">
        Order Summary
      </h2>
      <div className="space-y-3 mb-6 text-gray-300">
        <div className="flex justify-between">
          <span>Items</span>
          <span>₹{itemsPrice}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>₹{taxPrice}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>₹{shippingPrice}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-green-400 font-bold">
            <span>Discount ({appliedCouponCode})</span>
            <span>- ₹{couponDiscount}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xl font-bold text-white border-t border-gray-800 pt-4 mb-6">
        <span>Total</span>
        <span className="text-primary">₹{totalPrice}</span>
      </div>
      <button
        onClick={placeOrderHandler}
        disabled={isProcessing}
        className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {isProcessing ? (
          "Processing..."
        ) : (
          <>
            <ArrowRight size={20} /> Place Order
          </>
        )}
      </button>
    </div>
  </div>
);

export default OrderSummary;
