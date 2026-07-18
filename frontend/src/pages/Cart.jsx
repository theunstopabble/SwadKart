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
import { toast } from "react-hot-toast";

// Config & Components
import { BASEURL } from "../config";
import CouponSection from "../components/order/CouponSection";
import PhoneVerificationModal from "../components/order/PhoneVerificationModal";
import axios from "axios";

const Cart = () => {
 const navigate = useNavigate();
 const dispatch = useDispatch();

 // 1. Get Cart & User Info from Redux
 const cart = useSelector((state) => state.cart);
 const { userInfo } = useSelector((state) => state.user);
 const { cartItems } = cart;

 // 2. Local State
 const [couponCode, setCouponCode] = useState("");
 const [discount, setDiscount] = useState(0);
 const [appliedCoupon, setAppliedCoupon] = useState("");
 const [loading, setLoading] = useState(false);
 const [availableCoupons, setAvailableCoupons] = useState([]);
 const [showPhoneModal, setShowPhoneModal] = useState(false);

 // --- 3. Calculations ---
 const itemsPrice = cartItems.reduce(
 (acc, item) => acc + (item.price ?? 0) * (item.qty ?? 0),
 0,
 );

 // 5% Tax
 const taxPrice = Number((0.05 * itemsPrice).toFixed(2));

 // Free shipping over ₹500, else ₹40
 const shippingPrice = itemsPrice > 500 ? 0 : 40;

 const totalBeforeDiscount = itemsPrice + taxPrice + shippingPrice;

 // Ensure total never goes below 0
 const totalPrice = Math.max(0, totalBeforeDiscount - discount).toFixed(2);

 // --- 4. Fetch Coupons & Load Saved Coupon ---
 useEffect(() => {
 const abort = new AbortController();

 const fetchCoupons = async () => {
 try {
 const res = await fetch(`${BASEURL}/api/v1/coupons/available`, {
 credentials: "include",
 signal: abort.signal,
 });
 if (!res.ok) {
 console.error("Error fetching coupons: non-200 response");
 return;
 }
 const data = await res.json();
 setAvailableCoupons(Array.isArray(data) ? data : []);
 } catch (error) {
 if (error.name !== "AbortError") {
 console.error("Error fetching coupons:", error);
 }
 }
 };

 fetchCoupons();

 // Check Local Storage for previously applied coupons
 const savedCoupon = localStorage.getItem("appliedCoupon");
 const savedDiscount = localStorage.getItem("couponDiscount");

 if (savedCoupon && savedDiscount) {
 // Validate coupon is still active before showing stale data
 const cartTotal = itemsPrice + taxPrice + shippingPrice;
 fetch(`${BASEURL}/api/v1/coupons/validate`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ code: savedCoupon, orderTotal: cartTotal }),
 credentials: "include",
 signal: abort.signal,
 }).then((res) => {
 if (!res.ok) {
 localStorage.removeItem("appliedCoupon");
 localStorage.removeItem("couponDiscount");
 return;
 }
 setAppliedCoupon(savedCoupon);
 setCouponCode(savedCoupon);
 setDiscount(Number(savedDiscount));
 }).catch(() => {
 localStorage.removeItem("appliedCoupon");
 localStorage.removeItem("couponDiscount");
 });
 }

 return () => abort.abort();
 }, [itemsPrice, shippingPrice, taxPrice]);

 // --- 5. Handlers ---

 const addToCartHandler = (item, qty) => {
 if (qty > 10) return toast.error("Max limit reached (10 items)");
 if (qty < 1) return; // Prevent going below 1 via this handler
 dispatch(addToCart({ ...item, qty }));
 };

 const removeFromCartHandler = (cartUniqueId) => {
 dispatch(removeFromCart(cartUniqueId));
 toast.success("Item removed from bag");
 };

 const checkoutHandler = () => {
 if (cartItems.length === 0) return toast.error("Cart is empty");
 if (!userInfo) return navigate("/login?redirect=/shipping");
 if (!userInfo.phone || !userInfo.phoneVerified) {
 setShowPhoneModal(true);
 return;
 }
 navigate("/shipping");
 };

 const applyCouponHandler = async (codeOverride) => {
 const codeToApply = codeOverride || couponCode;

 if (!codeToApply) return toast.error("Please enter a coupon code");
 if (!userInfo) return toast.error("Please login to apply coupons");

 setLoading(true);
 try {
 const config = {
 headers: {
 "Content-Type": "application/json",
 },
 withCredentials: true,
 };

 const { data, status } = await axios.post(
 `${BASEURL}/api/v1/coupons/validate`,
 { code: codeToApply, orderAmount: itemsPrice },
 config,
 );

 if (status !== 200) {
 toast.error(data?.message || "Invalid or Expired Coupon");
 removeCouponHandler();
 setLoading(false);
 return;
 }

 setAppliedCoupon(codeToApply);
 setDiscount(data.discountAmount || 0);
 localStorage.setItem("appliedCoupon", codeToApply);
 localStorage.setItem("couponDiscount", String(data.discountAmount || 0));
 toast.success(data.message || "Coupon Applied Successfully!");
 } catch (error) {
 if (error.response?.status === 401) {
 toast.error("Session expired! Please log out and log in again.");
 } else {
 toast.error(
 error.response?.data?.message || "Invalid or Expired Coupon",
 );
 }

 if (error.response?.status !== 401) {
 removeCouponHandler();
 }
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

 // --- 6. Render ---
 return (
 <>
 {cartItems.length === 0 ? (
 <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center pt-20">
 <ShoppingBag size={80} className="text-gray-800 mb-6" />
 <h2 className="text-3xl font-extrabold uppercase mb-2">
 Your Bag is Empty
 </h2>
 <p className="text-gray-500 mb-8">
 Hungry? Add some delicious items now!
 </p>
 <Link
 to="/"
 className="bg-primary hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-bold uppercase transition-all shadow-lg shadow-primary/25"
 >
 Browse Menu
 </Link>
 </div>
 ) : (
 <div className="min-h-screen bg-black text-white pt-20 px-4 md:px-10 pb-20 font-sans">
 <div className="max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-4 mb-8">
 <ShoppingBag className="text-primary" size={32} />
 <div>
 <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tighter">
 Your <span className="text-primary">Food Bag</span>
 </h1>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
 Check your items before we start cooking
 </p>
 </div>
 </div>

 <div className="flex flex-col lg:flex-row gap-12">
 {/* 🛒 Left Column: Cart Items List */}
 <div className="lg:w-2/3 space-y-4">
 {cartItems.map((item) => (
 <div
 key={item.cartUniqueId || item._id}
 className="flex flex-col sm:flex-row items-start sm:items-center bg-gray-900 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-all group animate-gpu"
 >
 {/* Product Image */}
 <img
 src={item.image || "https://placehold.co/100"}
 alt={item.name || "Item"}
 onError={(e) => {
 e.target.src = "https://placehold.co/100";
 }}
 className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl mb-4 sm:mb-0 grayscale group-hover:grayscale-0 transition-all duration-500 border border-gray-800"
 />

 {/* Product Details */}
 <div className="sm:ml-6 flex-1 text-left">
 <span className="text-lg font-bold uppercase text-white">
 {item.name || "Unknown Item"}
 </span>
 <p className="text-primary font-bold text-lg mt-1">
 ₹{item.price ?? 0}
 </p>

 {/* Variants & Addons Display */}
 <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
 {/* Size/Variant */}
 {item.selectedVariant && (
 <span className="text-[9px] bg-black/50 px-2 py-1 rounded text-gray-400 uppercase font-bold tracking-wider border border-gray-700">
 Size: {item.selectedVariant.name}
 </span>
 )}

 {/* Addons */}
 {item.selectedAddons && item.selectedAddons.length > 0 && (
 <div className="flex flex-wrap gap-1">
 {item.selectedAddons.map((addon, idx) => (
 <span
 key={idx}
 className="text-[9px] bg-primary/10 px-2 py-1 rounded text-primary uppercase font-bold border border-primary/20"
 >
 + {addon.name}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Quantity Controls & Delete */}
 <div className="flex items-center gap-4 mt-4 sm:mt-0 sm:ml-auto">
 <div className="flex items-center bg-black/50 border border-gray-700 rounded-xl overflow-hidden">
 <button
 onClick={() => addToCartHandler(item, item.qty - 1)}
 disabled={item.qty === 1}
 aria-label={`Decrease quantity of ${item.name}`}
 className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-20 transition-all"
 >
 <Minus size={18} />
 </button>
 <span className="px-3 font-bold text-sm w-10 text-center text-white">
 {item.qty}
 </span>
 <button
 onClick={() => addToCartHandler(item, item.qty + 1)}
 aria-label={`Increase quantity of ${item.name}`}
 className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 transition-all"
 >
 <Plus size={18} />
 </button>
 </div>

 <button
 onClick={() => removeFromCartHandler(item.cartUniqueId)}
 aria-label={`Remove ${item.name} from cart`}
 className="p-3 bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </div>
 ))}

 <Link
 to="/"
 className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mt-6 font-bold text-xs uppercase tracking-widest transition-colors group"
 >
 <ArrowLeft
 size={16}
 className="group-hover:-translate-x-1 transition-transform"
 />{" "}
 Continue Shopping
 </Link>
 </div>

 {/* 🧾 Right Column: Bill Details */}
 <div className="lg:w-1/3">
 <div className="bg-gray-900 p-8 rounded-[2rem] border border-gray-800 sticky top-28 shadow-2xl">
 <h2 className="text-xl font-extrabold uppercase border-b border-gray-800 pb-4 mb-6 text-white">
 Bill Details
 </h2>

 <div className="space-y-4 mb-8">
 {/* Subtotal */}
 <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
 <span>Subtotal</span>
 <span className="text-white">₹{itemsPrice.toFixed(2)}</span>
 </div>

 {/* GST */}
 <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
 <span>GST (5%)</span>
 <span className="text-white">₹{taxPrice.toFixed(2)}</span>
 </div>

 {/* Delivery Fee */}
 <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
 <span>Delivery Fee</span>
 <span
 className={
 shippingPrice === 0 ? "text-green-500" : "text-white"
 }
 >
 {shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}
 </span>
 </div>

 {/* Discount Display */}
 {discount > 0 && (
 <div className="flex justify-between text-xs font-black text-green-500 uppercase tracking-wider animate-pulse">
 <span>Coupon ({appliedCoupon})</span>
 <span>- ₹{discount}</span>
 </div>
 )}

 {/* Total */}
 <div className="border-t border-gray-800 pt-5 flex justify-between items-end">
 <span className="text-sm font-bold text-gray-400 uppercase ">
 To Pay
 </span>
 <span className="text-4xl font-extrabold text-primary tracking-tighter">
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

 {/* Checkout Button */}
 <button
 onClick={checkoutHandler}
 className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-bold uppercase text-sm tracking-[0.15em] shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group mt-8 active:scale-[0.98]"
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
 )}

 {showPhoneModal && (
 <PhoneVerificationModal
 onClose={() => setShowPhoneModal(false)}
 onVerified={() => {
 setShowPhoneModal(false);
 navigate("/shipping");
 }}
 />
 )}
 </>
 );
};

export default Cart;
