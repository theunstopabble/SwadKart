import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config";

// Modular Components
import CartItem from "../components/order/CartItem";
import CouponSection from "../components/order/CouponSection";

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Billing Calculations
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.qty * item.price,
    0
  );
  const tax = subtotal * 0.05;
  const shipping = subtotal > 500 ? 0 : 40;
  const total = subtotal + tax + shipping - discount;

  useEffect(() => {
    if (userInfo) fetchAvailableCoupons();
  }, [userInfo]);

  const fetchAvailableCoupons = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await axios.get(
        `${BASE_URL}/api/v1/coupons/available`,
        config
      );
      setAvailableCoupons(data);
    } catch (e) {
      console.error("Coupons load error");
    }
  };

  const applyCouponHandler = async (codeToApply = couponCode) => {
    if (!codeToApply) return toast.error("Enter a code!");
    if (!userInfo) return navigate("/login");

    try {
      setLoadingCoupon(true);
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await axios.post(
        `${BASE_URL}/api/v1/coupons/validate`,
        { code: codeToApply, orderAmount: subtotal },
        config
      );

      setDiscount(data.discountAmount);
      setAppliedCoupon(data.code);
      setCouponCode(data.code);
      toast.success(`PROMO APPLIED! Saved ₹${data.discountAmount}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid Code");
    } finally {
      setLoadingCoupon(false);
    }
  };

  const checkoutHandler = () => {
    localStorage.setItem("couponDiscount", JSON.stringify(discount));
    localStorage.setItem("appliedCoupon", JSON.stringify(appliedCoupon));
    navigate(userInfo ? "/shipping" : "/login?redirect=shipping");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-10 pb-20">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <ShoppingBag className="text-primary" size={36} /> Your{" "}
            <span className="text-primary">Food Bag</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2">
            Check your items before we start cooking
          </p>
        </header>

        {cartItems.length === 0 ? (
          <div className="text-center py-24 bg-gray-950 rounded-[3rem] border-2 border-dashed border-gray-900">
            <ShoppingBag size={64} className="mx-auto mb-6 text-gray-800" />
            <h2 className="text-2xl font-black uppercase italic text-gray-500 mb-6">
              Your bag is empty
            </h2>
            <Link
              to="/"
              className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-all"
            >
              Explore Kitchens
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* List Section */}
            <div className="w-full lg:w-2/3 space-y-6">
              {cartItems.map((item) => (
                <CartItem key={item.cartId || item._id} item={item} />
              ))}
            </div>

            {/* Billing Section */}
            <div className="w-full lg:w-1/3 sticky top-24">
              <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900 shadow-2xl space-y-8">
                <h2 className="text-xl font-black italic uppercase border-b border-gray-900 pb-4">
                  Bill Details
                </h2>

                <div className="space-y-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white italic font-black text-sm">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="text-white italic font-black text-sm">
                      ₹{tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span
                      className={
                        shipping === 0
                          ? "text-green-500 font-black italic"
                          : "text-white italic font-black text-sm"
                      }
                    >
                      {shipping === 0 ? "FREE" : `₹${shipping}`}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-green-500 font-black italic border-t border-dashed border-gray-800 pt-4 animate-pulse">
                      <span>Promo ({appliedCoupon})</span>
                      <span>- ₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-2xl font-black italic uppercase text-white border-t border-gray-900 pt-6">
                  <span>To Pay</span>
                  <span className="text-primary">
                    ₹{(total < 0 ? 0 : total).toFixed(2)}
                  </span>
                </div>

                <CouponSection
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  applyHandler={applyCouponHandler}
                  removeHandler={() => {
                    setDiscount(0);
                    setAppliedCoupon("");
                    setCouponCode("");
                  }}
                  availableCoupons={availableCoupons}
                  appliedCoupon={appliedCoupon}
                  loading={loadingCoupon}
                  discount={discount}
                />

                <button
                  onClick={checkoutHandler}
                  className="w-full bg-primary hover:bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 flex justify-between items-center px-10 transition-all active:scale-95 group"
                >
                  <span>Checkout Now</span>
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-2 transition-transform"
                  />
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
