import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "../redux/cartSlice";
import CheckoutSteps from "../components/CheckoutSteps";
import OrderSummary from "../components/order/OrderSummary";
import SuccessScreen from "../components/order/SuccessScreen";
import PlaceOrderSection from "../components/order/PlaceOrderSection";
import OrderItemCard from "../components/order/OrderItemCard";
import {
  MapPin,
  Wallet,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "react-hot-toast";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [paymentDetails, setPaymentDetails] = useState({ id: "", date: "" });

  // --- Calculations ---
  const itemsPrice = cart.cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice = itemsPrice > 500 ? 0 : 40;
  const taxPrice = Number((0.05 * itemsPrice).toFixed(2));
  const couponDiscount = Number(localStorage.getItem("couponDiscount")) || 0;
  const appliedCouponCode =
    JSON.parse(localStorage.getItem("appliedCoupon")) || "";

  // Calculate Total
  const totalPrice = (
    itemsPrice +
    shippingPrice +
    taxPrice -
    couponDiscount
  ).toFixed(2);

  // --- Redirect if missing data ---
  useEffect(() => {
    if (!cart.shippingAddress.address) {
      navigate("/shipping");
    } else if (!cart.paymentMethod) {
      navigate("/payment");
    }
  }, [cart, navigate]);

  // --- Razorpay SDK Loader ---
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // --- Success Logic ---
  const handleOrderSuccess = (dbOrderId, paymentId) => {
    setPaymentDetails({
      id: paymentId,
      date: new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setIsProcessing(false);
    setShowSuccessScreen(true);

    // Clear Local Storage Coupons
    localStorage.removeItem("couponDiscount");
    localStorage.removeItem("appliedCoupon");

    // Countdown and Redirect
    let timer = 4;
    const interval = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        dispatch(clearCart());
        navigate(`/order/${dbOrderId}`);
      }
    }, 1000);
  };

  // --- Verify Online Payment ---
  const verifyPayment = async (response, dbOrderId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          orderId: dbOrderId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        handleOrderSuccess(dbOrderId, response.razorpay_payment_id);
      } else {
        toast.error("Security Alert: Payment verification failed!");
      }
    } catch (error) {
      toast.error("Verification protocol error");
    }
  };

  // --- Main Order Handler ---
  const placeOrderHandler = async () => {
    try {
      setIsProcessing(true);

      // 1. Check Gateway for Online Payment
      if (cart.paymentMethod === "Online") {
        const sdkLoaded = await loadRazorpay();
        if (!sdkLoaded) {
          toast.error("Gateway offline. Check connection.");
          setIsProcessing(false);
          return;
        }
      }

      // 2. Format Items (CRITICAL: Ensuring Restaurant ID is Passed)
      const formattedItems = cart.cartItems.map((item) => {
        if (!item.restaurant) {
          console.warn("⚠️ Warning: Item missing Restaurant ID", item);
        }
        return {
          name: item.name,
          qty: Number(item.qty),
          image: item.image,
          price: Number(item.price),
          product: item.product,
          restaurant: item.restaurant, // 👈 Must match what we saved in cartSlice
          selectedVariant: item.selectedVariant || null,
          selectedAddons: item.selectedAddons || [],
        };
      });

      // 3. Format Address
      const finalShippingAddress = {
        ...cart.shippingAddress,
        state: cart.shippingAddress.state || "Rajasthan",
        country: cart.shippingAddress.country || "India",
      };

      // 4. Create Order in Database
      const res = await fetch(`${BASE_URL}/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({
          orderItems: formattedItems,
          shippingAddress: finalShippingAddress,
          paymentMethod: cart.paymentMethod,
          itemsPrice,
          taxPrice,
          shippingPrice,
          totalPrice,
          couponCode: appliedCouponCode,
          couponDiscount,
        }),
      });

      const dbData = await res.json();
      if (!res.ok) throw new Error(dbData.message);

      // 5. Handle Payment Flow
      if (cart.paymentMethod === "COD") {
        handleOrderSuccess(
          dbData._id,
          "COD-" + dbData._id.slice(-6).toUpperCase()
        );
      } else {
        const orderRes = await fetch(
          `${BASE_URL}/api/v1/payment/create-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userInfo.token}`,
            },
            body: JSON.stringify({ amount: totalPrice }),
          }
        );
        const { order: razorpayOrder } = await orderRes.json();

        const keyRes = await fetch(`${BASE_URL}/api/v1/payment/key`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        const { key } = await keyRes.json();

        const options = {
          key,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "SwadKart Pro",
          description: "Food Delivery Mission",
          order_id: razorpayOrder.id,
          handler: (res) => verifyPayment(res, dbData._id),
          prefill: {
            name: userInfo.name,
            email: userInfo.email,
            contact: cart.shippingAddress.phone,
          },
          theme: { color: "#ef4444" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        setIsProcessing(false);
      }
    } catch (error) {
      setIsProcessing(false);
      console.error(error);
      toast.error(error.message || "Mission Failed: Order error");
    }
  };

  if (showSuccessScreen)
    return (
      <SuccessScreen
        countdown={countdown}
        paymentDetails={paymentDetails}
        totalPrice={totalPrice}
      />
    );

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-10 pb-20 font-sans">
      <CheckoutSteps step1 step2 step3 step4 />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12 items-start">
        {/* 📝 LEFT COLUMN (8 Units) */}
        <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Delivery Section */}
          <PlaceOrderSection
            icon={<MapPin size={24} className="text-primary" />}
            title="Delivery"
            label="To"
          >
            <div className="space-y-1 bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-sm">
              <p className="font-extrabold uppercase text-lg tracking-tight italic text-white">
                {cart.shippingAddress.fullName}
              </p>
              <p className="text-sm text-gray-400 font-medium italic leading-relaxed">
                {cart.shippingAddress.address}, {cart.shippingAddress.city} -{" "}
                {cart.shippingAddress.postalCode}
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>{" "}
                  Verified: {cart.shippingAddress.phone}
                </div>
              </div>
            </div>
          </PlaceOrderSection>

          {/* Payment Section */}
          <PlaceOrderSection
            icon={<Wallet size={24} className="text-primary" />}
            title="Payment"
            label="Method"
          >
            <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm">
              <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <ShieldCheck size={28} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-blue-400 uppercase tracking-[0.2em] italic">
                  {cart.paymentMethod === "Online"
                    ? "Secure Digital Transaction"
                    : "Manual Cash Protocol"}
                </p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                  Encrypted End-to-End
                </p>
              </div>
            </div>
          </PlaceOrderSection>

          {/* Review Section */}
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
                <ShoppingBag size={24} />
              </div>
              <h2 className="text-2xl font-extrabold italic uppercase tracking-tighter text-white">
                Order <span className="text-orange-500">Review</span>
              </h2>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
              {cart.cartItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-black/50 border border-gray-800 rounded-xl p-2"
                >
                  <OrderItemCard item={item} />
                </div>
              ))}
            </div>

            <Link
              to="/cart"
              className="mt-8 inline-flex items-center gap-2 text-[10px] font-extrabold text-gray-500 hover:text-primary uppercase tracking-[0.3em] transition-all italic border-b border-gray-800 pb-1"
            >
              <ArrowLeft size={12} /> Modify Selection
            </Link>
          </div>
        </div>

        {/* 💰 RIGHT COLUMN (4 Units) */}
        <div className="lg:col-span-4 sticky top-28 animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 shadow-2xl overflow-hidden">
            <OrderSummary
              isPlaceOrder={true}
              itemsPrice={itemsPrice}
              taxPrice={taxPrice}
              shippingPrice={shippingPrice}
              couponDiscount={couponDiscount}
              appliedCouponCode={appliedCouponCode}
              totalPrice={totalPrice}
              isProcessing={isProcessing}
              placeOrderHandler={placeOrderHandler}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
