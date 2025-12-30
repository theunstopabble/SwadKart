import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart } from "../redux/cartSlice";
import {
  Trash2,
  ShoppingCart,
  ArrowRight,
  Minus,
  Plus,
  Tag,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { BASE_URL } from "../config";

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart);
  const { cartItems } = cart;
  const { userInfo } = useSelector((state) => state.user);

  // 🎫 Coupon States
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // 1. Calculate Subtotal
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.qty * item.price,
    0
  );

  // 2. Existing Logic (Tax & Shipping)
  const tax = subtotal * 0.05; // 5% Tax
  const shipping = subtotal > 500 ? 0 : 40; // Free shipping over ₹500

  // 3. Final Total (Subtotal + Tax + Shipping - Discount)
  const total = subtotal + tax + shipping - discount;

  // 🔄 Fetch Smart Coupons on Load
  useEffect(() => {
    if (userInfo) {
      fetchAvailableCoupons();
    }
  }, [userInfo]);

  const fetchAvailableCoupons = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await axios.get(
        `${BASE_URL}/api/v1/coupons/available`,
        config
      );
      setAvailableCoupons(data);
    } catch (error) {
      console.error("Error fetching coupons", error);
    }
  };

  // 🎫 API Handler: Apply Coupon
  const applyCouponHandler = async () => {
    if (!couponCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    // 🔒 Security Check: User login hai ya nahi?
    if (!userInfo || !userInfo.token) {
      toast.error("Please login to apply coupons");
      navigate("/login");
      return;
    }

    try {
      setLoadingCoupon(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          // 👇 FIX: Use 'userInfo.token' instead of localStorage directly
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axios.post(
        `${BASE_URL}/api/v1/coupons/validate`,
        { code: couponCode, orderAmount: subtotal },
        config
      );

      setDiscount(data.discountAmount);
      setAppliedCoupon(data.code);
      toast.success(
        `Coupon ${data.code} Applied! Saved ₹${data.discountAmount}`
      );
      setLoadingCoupon(false);
    } catch (error) {
      setLoadingCoupon(false);
      setDiscount(0);
      setAppliedCoupon("");
      toast.error(error.response?.data?.message || "Invalid Coupon");
    }
  };

  // 🚀 Checkout Handler
  const checkoutHandler = () => {
    if (!userInfo) {
      navigate("/login?redirect=shipping");
    } else {
      // Save Discount to LocalStorage for next steps
      localStorage.setItem("couponDiscount", JSON.stringify(discount));
      localStorage.setItem("appliedCoupon", JSON.stringify(appliedCoupon));
      navigate("/shipping");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
          <ShoppingCart className="text-red-500" size={32} /> Your Food Cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="flex justify-center mb-4">
              <ShoppingCart size={64} className="text-gray-600" />
            </div>
            <p className="text-2xl text-gray-400 font-bold mb-2">
              Your cart is empty!
            </p>
            <p className="text-gray-500 mb-6">
              Looks like you haven't added any delicious food yet.
            </p>
            <Link
              to="/"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-red-600/30"
            >
              Explore Restaurants
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* CART ITEMS LIST */}
            <div className="lg:w-2/3 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-gray-900 p-4 rounded-xl flex items-center gap-4 border border-gray-800 hover:border-gray-700 transition-all"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />

                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-white">
                      {item.name}
                    </h3>
                    <p className="text-red-500 font-bold">₹{item.price}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 bg-black/50 px-3 py-1 rounded-lg border border-gray-700">
                    <button
                      onClick={() =>
                        dispatch(addToCart({ ...item, qty: item.qty - 1 }))
                      }
                      disabled={item.qty === 1}
                      className="text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold w-4 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() =>
                        dispatch(addToCart({ ...item, qty: item.qty + 1 }))
                      }
                      className="text-gray-400 hover:text-white"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => dispatch(removeFromCart(item._id))}
                    className="bg-red-500/10 p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            {/* ORDER SUMMARY (Checkout Box) */}
            <div className="lg:w-1/3">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 sticky top-24">
                <h2 className="text-xl font-bold mb-6 border-b border-gray-800 pb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 text-gray-300 mb-6">
                  <div className="flex justify-between">
                    <span>
                      Subtotal (
                      {cartItems.reduce((acc, item) => acc + item.qty, 0)}{" "}
                      items)
                    </span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className={shipping === 0 ? "text-green-400" : ""}>
                      {shipping === 0 ? "FREE" : `₹${shipping}`}
                    </span>
                  </div>

                  {/* 🎫 COUPON DISCOUNT ROW (Dynamic) */}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-400 font-bold animate-pulse">
                      <span>Coupon ({appliedCoupon})</span>
                      <span>- ₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xl font-bold text-white border-t border-gray-800 pt-4 mb-6">
                  <span>Total</span>
                  <span className="text-red-500">
                    ₹{(total < 0 ? 0 : total).toFixed(2)}
                  </span>
                </div>

                {/* 🎫 COUPON INPUT SECTION */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-2 block">
                    Have a Coupon?
                  </label>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Tag
                        className="absolute left-3 top-3 text-gray-500"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Ex: SWAD50"
                        className="w-full bg-black text-white pl-10 pr-3 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 uppercase font-bold"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={applyCouponHandler}
                      disabled={loadingCoupon}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
                    >
                      {loadingCoupon ? "..." : "Apply"}
                    </button>
                  </div>

                  {/* 👇 SMART DROPDOWN LIST */}
                  {availableCoupons.length > 0 && (
                    <div className="bg-black/40 rounded-lg border border-gray-800 p-2">
                      <p className="text-xs text-gray-500 mb-2 px-1 flex items-center gap-1">
                        <Tag size={10} /> Best Coupons for You:
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {availableCoupons.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => setCouponCode(c.code)}
                            className={`p-2 rounded cursor-pointer border border-transparent hover:border-red-500/50 transition-all flex justify-between items-center group ${
                              couponCode === c.code
                                ? "bg-red-500/10 border-red-500"
                                : "bg-gray-800"
                            }`}
                          >
                            <div>
                              <p className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                                {c.code}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {c.discountPercentage}% Off upto ₹
                                {c.maxDiscountAmount}
                              </p>
                            </div>
                            <div className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                              SAVE
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={checkoutHandler}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/25 transform hover:-translate-y-1"
                >
                  Proceed to Checkout <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
