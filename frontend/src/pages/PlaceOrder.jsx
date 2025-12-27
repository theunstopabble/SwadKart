import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "../redux/cartSlice";
import CheckoutSteps from "../components/CheckoutSteps";
import {
  MapPin,
  Wallet,
  ShoppingBag,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { BASE_URL } from "../config";
import { Capacitor } from "@capacitor/core";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  // 🟢 States for Animation
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [paymentDetails, setPaymentDetails] = useState({ id: "", date: "" });

  const itemsPrice = cart.cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice = itemsPrice > 500 ? 0 : 40;
  const taxPrice = Number((0.05 * itemsPrice).toFixed(2));
  const totalPrice = (
    Number(itemsPrice) +
    Number(shippingPrice) +
    Number(taxPrice)
  ).toFixed(2);

  useEffect(() => {
    if (!cart.shippingAddress.address) navigate("/shipping");
    else if (!cart.paymentMethod) navigate("/payment");
  }, [cart, navigate]);

  // --- VERIFY PAYMENT ---
  const verifyPayment = async (response, dbOrderId) => {
    try {
      const verifyRes = await fetch(`${BASE_URL}/api/v1/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          orderId: dbOrderId,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        // ✅ Show the GREEN SUCCESS SCREEN
        setPaymentDetails({
          id: response.razorpay_payment_id,
          date: new Date().toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        });
        setIsProcessing(false); // Loader hatao
        setShowSuccessScreen(true); // Green screen dikhao

        // ⏱️ 4 Second Countdown Timer
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
      } else {
        setIsProcessing(false);
        alert(`Payment Verification Failed: ${verifyData.message}`);
      }
    } catch (error) {
      setIsProcessing(false);
      alert("Verification Error: " + error.message);
    }
  };

  const placeOrderHandler = async () => {
    try {
      setIsProcessing(true);

      // Create Order
      const formattedOrderItems = cart.cartItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
        product: item._id,
        restaurant: item.restaurant,
      }));
      const orderData = {
        orderItems: formattedOrderItems,
        shippingAddress: cart.shippingAddress,
        paymentMethod: cart.paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      };

      const res = await fetch(`${BASE_URL}/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (cart.paymentMethod === "COD") {
        setPaymentDetails({
          id: "COD-" + data._id.slice(-6).toUpperCase(),
          date: new Date().toLocaleString(),
        });
        setIsProcessing(false);
        setShowSuccessScreen(true);
        let timer = 4;
        const interval = setInterval(() => {
          timer -= 1;
          setCountdown(timer);
          if (timer === 0) {
            clearInterval(interval);
            dispatch(clearCart());
            navigate(`/order/${data._id}`);
          }
        }, 1000);
        return;
      }

      if (cart.paymentMethod === "Online") {
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
          key: key,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "SwadKart",
          description: "Food Order",
          order_id: razorpayOrder.id,
          prefill: {
            name: userInfo.name,
            email: userInfo.email,
            contact: userInfo.phone || "9999999999",
          },
          theme: { color: "#e11d48" },
        };

        if (Capacitor.isNativePlatform()) {
          // @ts-ignore
          window.RazorpayCheckout.open(
            options,
            (successData) => {
              let responseObj = successData;
              if (typeof successData === "string") {
                try {
                  responseObj = JSON.parse(successData);
                } catch (e) {
                  responseObj = { razorpay_payment_id: successData };
                }
              }
              verifyPayment(
                { razorpay_payment_id: responseObj.razorpay_payment_id },
                data._id
              );
            },
            (error) => {
              setIsProcessing(false);
              alert(`Payment Failed: ${JSON.stringify(error)}`);
            }
          );
        } else {
          const loadRazorpayScript = () =>
            new Promise((resolve) => {
              const s = document.createElement("script");
              s.src = "https://checkout.razorpay.com/v1/checkout.js";
              s.onload = () => resolve(true);
              document.body.appendChild(s);
            });
          await loadRazorpayScript();
          const rzp = new window.Razorpay({
            ...options,
            handler: function (response) {
              verifyPayment(response, data._id);
            },
          });
          rzp.open();
          setIsProcessing(false);
        }
      }
    } catch (error) {
      setIsProcessing(false);
      alert(error.message);
    }
  };

  // 🟢 1. EXACT RAZORPAY SUCCESS SCREEN (Replica)
  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 bg-[#0cbf66] z-[9999] flex flex-col items-center justify-between py-12 px-6 text-white font-sans animate-in fade-in duration-300">
        {/* Top Section */}
        <div className="text-center space-y-2 mt-8">
          <p className="text-green-100 text-sm font-medium">
            You will be redirected in {countdown} seconds
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Successful
          </h1>
        </div>

        {/* Animated Checkmark Circle */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Outer Ring */}
          <div className="absolute w-28 h-28 bg-[#3ed186] rounded-full animate-ping opacity-75"></div>
          {/* Inner Solid Circle */}
          <div className="relative w-24 h-24 bg-[#51e898] rounded-full flex items-center justify-center shadow-lg">
            <Check
              size={48}
              strokeWidth={4}
              className="text-white drop-shadow-md"
            />
          </div>
        </div>

        {/* Bottom Details Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-gray-800 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-lg text-black">SwadKart</span>
            <span className="font-bold text-lg text-black">₹{totalPrice}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">{paymentDetails.date}</p>

          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Payment ID</span>
              <span className="text-sm font-mono font-medium text-gray-700 truncate w-40">
                {paymentDetails.id}
              </span>
            </div>
            <button className="text-gray-400 hover:text-blue-600">
              <Copy size={18} />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
            <div className="w-3 h-3 bg-gray-300 rounded-full flex items-center justify-center text-[8px] text-white">
              i
            </div>
            <span>Visit razorpay.com/support for queries</span>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="text-center opacity-80 mt-4">
          <p className="text-xs font-semibold tracking-wide flex items-center justify-center gap-1">
            Secured by{" "}
            <span className="font-bold italic text-lg">Razorpay</span>
          </p>
        </div>
      </div>
    );
  }

  // 🟡 2. LOADING SPINNER (Processing)
  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center text-white backdrop-blur-sm">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-primary rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold animate-pulse">
          Processing Payment...
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          Please do not close the app
        </p>
      </div>
    );
  }

  // 🔴 3. MAIN UI
  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-10">
      <CheckoutSteps step1 step2 step3 step4 />
      {/* ... (Same layout code as before) ... */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 mt-8">
        <div className="lg:w-2/3 space-y-6">
          {/* Components for Address, Payment, Items (Same as before) */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <MapPin /> Shipping Details
            </h2>
            <p className="text-gray-300">{cart.shippingAddress.address}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <Wallet /> Payment Method
            </h2>
            <p className="text-gray-300">{cart.paymentMethod}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <ShoppingBag /> Items
            </h2>
            <p>Items Count: {cart.cartItems.length}</p>
          </div>
        </div>
        <div className="lg:w-1/3">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 sticky top-24">
            <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-4">
              Order Summary
            </h2>
            <div className="flex justify-between text-xl font-bold text-white border-t border-gray-800 pt-4 mb-6">
              <span>Total</span>
              <span className="text-primary">₹{totalPrice}</span>
            </div>
            <button
              onClick={placeOrderHandler}
              disabled={isProcessing}
              className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                "Wait..."
              ) : (
                <>
                  Place Order <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
