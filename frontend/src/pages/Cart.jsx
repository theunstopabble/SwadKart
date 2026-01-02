import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { addToCart, removeFromCart } from "../redux/cartSlice";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import CouponSection from "../components/order/CouponSection";
import { BASE_URL } from "../config";
import toast from "react-hot-toast";

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 1. Get Cart & User Info from Redux
  const cart = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user); // ✅ Necessary for Auth Token
  const { cartItems } = cart;

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // --- 2. Calculations ---
  const itemsPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const taxPrice = Number((0.05 * itemsPrice).toFixed(2));
  const shippingPrice = itemsPrice > 500 ? 0 : 40;
  const totalBeforeDiscount = itemsPrice + taxPrice + shippingPrice;
  const totalPrice = (totalBeforeDiscount - discount).toFixed(2);

  // --- 3. Fetch Coupons (On Load) ---
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        // Public route (no token needed for listing now)
        const res = await fetch(`${BASE_URL}/api/v1/coupons/available`);
        const data = await res.json();
        if (res.ok) {
          setAvailableCoupons(data);
        }
      } catch (error) {
        console.error("Error fetching coupons:", error);
      }
    };

    fetchCoupons();

    // Persistence Check (Local Storage)
    const savedCoupon = localStorage.getItem("appliedCoupon");
    const savedDiscount = localStorage.getItem("couponDiscount");
    if (savedCoupon && savedDiscount) {
      setAppliedCoupon(JSON.parse(savedCoupon));
      setCouponCode(JSON.parse(savedCoupon));
      setDiscount(Number(savedDiscount));
    }
  }, []);

  // --- 4. Handlers ---
  const addToCartHandler = (item, qty) => {
    if (qty > 10) return toast.error("Max limit reached");
    dispatch(addToCart({ ...item, qty }));
  };

  const removeFromCartHandler = (id) => {
    dispatch(removeFromCart(id));
  };

  const checkoutHandler = () => {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    navigate(userInfo ? "/shipping" : "/login?redirect=/shipping");
  };

  // ✅ CRITICAL FIX: Apply Coupon Handler
  const applyCouponHandler = async (codeOverride) => {
    const codeToApply = codeOverride || couponCode;

    if (!codeToApply) return toast.error("Enter a coupon code");

    // 🔒 Security Check: User must be logged in to apply coupon
    if (!userInfo) {
      toast.error("Please login to verify coupon eligibility");
      return navigate("/login?redirect=/cart");
    }

    setLoading(true);
    try {
      const config = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`, // ✅ FIX: Sending Token
        },
        body: JSON.stringify({
          code: codeToApply, // ✅ FIX: Matching Backend Key
          orderAmount: itemsPrice, // ✅ FIX: Matching Backend Key
        }),
      };

      const res = await fetch(`${BASE_URL}/api/v1/coupons/validate`, config);
      const data = await res.json();

      if (res.ok) {
        setDiscount(data.discountAmount);
        setAppliedCoupon(codeToApply);
        setCouponCode(codeToApply);

        localStorage.setItem("couponDiscount", data.discountAmount);
        localStorage.setItem("appliedCoupon", JSON.stringify(codeToApply));

        toast.success(
          `Coupon ${codeToApply} Applied! Saved ₹${data.discountAmount}`
        );
      } else {
        setDiscount(0);
        setAppliedCoupon("");
        localStorage.removeItem("couponDiscount");
        localStorage.removeItem("appliedCoupon");
        toast.error(data.message || "Invalid Coupon");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const removeCouponHandler = () => {
    setDiscount(0);
    setAppliedCoupon("");
    setCouponCode("");
    localStorage.removeItem("couponDiscount");
    localStorage.removeItem("appliedCoupon");
    toast.success("Coupon Removed");
  };

  // --- Render Empty Cart ---
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center pt-20">
        <ShoppingBag size={80} className="text-gray-800 mb-6" />
        <h2 className="text-3xl font-black italic uppercase mb-2">
          Your Bag is Empty
        </h2>
        <p className="text-gray-500 mb-8">
          Hungry? Add some delicious items now!
        </p>
        <Link
          to="/"
          className="bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-xl font-bold uppercase transition-all"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  // --- Render Main Cart ---
  return (
    <div className="min-h-screen bg-black text-white pt-28 px-4 md:px-10 pb-20 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <ShoppingBag className="text-primary" size={32} />
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
              Your <span className="text-primary">Food Bag</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
              Check your items before we start cooking
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* 🛒 Left: Cart Items */}
          <div className="lg:w-2/3 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row items-center bg-[#0a0a0a] border border-gray-900 p-4 rounded-2xl hover:border-gray-800 transition-all group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-xl mb-4 sm:mb-0 grayscale group-hover:grayscale-0 transition-all duration-500"
                />

                <div className="sm:ml-6 flex-1 text-center sm:text-left">
                  <Link
                    to={`/product/${item.product}`}
                    className="text-lg font-black italic uppercase text-white hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-primary font-bold text-lg mt-1">
                    ₹{item.price}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                    {item.selectedVariant && (
                      <span className="text-[9px] bg-gray-800 px-2 py-1 rounded text-gray-300 uppercase font-bold">
                        {item.selectedVariant.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <div className="flex items-center bg-black border border-gray-800 rounded-lg">
                    <button
                      onClick={() => addToCartHandler(item, item.qty - 1)}
                      disabled={item.qty === 1}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-2 font-black text-sm w-8 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => addToCartHandler(item, item.qty + 1)}
                      className="p-2 text-gray-400 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCartHandler(item._id)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-white mt-6 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
          </div>

          {/* 🧾 Right: Bill Details */}
          <div className="lg:w-1/3">
            <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-gray-900 sticky top-28 shadow-2xl">
              <h2 className="text-xl font-black italic uppercase border-b border-gray-800 pb-4 mb-6">
                Bill Details
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Subtotal</span>
                  <span className="text-white">₹{itemsPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>GST (5%)</span>
                  <span className="text-white">₹{taxPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Delivery Fee</span>
                  <span
                    className={
                      shippingPrice === 0 ? "text-green-500" : "text-white"
                    }
                  >
                    {shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-xs font-black text-green-500 uppercase tracking-wider animate-pulse">
                    <span>Coupon ({appliedCoupon})</span>
                    <span>- ₹{discount}</span>
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 flex justify-between items-end">
                  <span className="text-sm font-black text-gray-200 uppercase italic">
                    To Pay
                  </span>
                  <span className="text-3xl font-black text-primary italic tracking-tighter">
                    ₹{totalPrice}
                  </span>
                </div>
              </div>

              {/* 🎟️ Coupon Component */}
              <CouponSection
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                applyHandler={applyCouponHandler}
                removeHandler={removeCouponHandler}
                availableCoupons={availableCoupons}
                appliedCoupon={appliedCoupon}
                loading={loading}
                discount={discount}
              />

              <button
                onClick={checkoutHandler}
                className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-sm tracking-[0.2em] shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 group mt-6"
              >
                Checkout Now{" "}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
