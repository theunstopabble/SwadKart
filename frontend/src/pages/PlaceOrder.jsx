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
  CheckCircle,
} from "lucide-react";
import { BASE_URL } from "../config";
import { Capacitor } from "@capacitor/core";
// 👇 IMPORT STATUS BAR (Agar zaroorat pade to color change karne ke liye)
import { StatusBar } from "@capacitor/status-bar";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Calculations
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
        setPaymentSuccess(true);
        setTimeout(() => {
          dispatch(clearCart());
          navigate(`/order/${dbOrderId}`);
          setIsProcessing(false);
          setPaymentSuccess(false);
        }, 2500);
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

      // 1. Create Order
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
        setPaymentSuccess(true);
        setTimeout(() => {
          dispatch(clearCart());
          navigate(`/order/${data._id}`);
          setIsProcessing(false);
        }, 2000);
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

        // 🎨 UI FIX: Name space diya hai taaki overlap na ho, description me naam dikhaya hai
        const options = {
          key: key,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: " ", // 👈 TRICK: Empty Space to avoid status bar overlap
          description: "Paying to SwadKart", // 👈 Yahan naam dikhega
          image: "https://swadkart-pro.vercel.app/logo.png",
          order_id: razorpayOrder.id,
          prefill: {
            name: userInfo.name,
            email: userInfo.email,
            contact: userInfo.phone || "9999999999",
          },
          theme: { color: "#e11d48", hide_topbar: false }, // Topbar enabled
          retry: { enabled: false }, // Retry popup disable (Clean UI)
        };

        if (Capacitor.isNativePlatform()) {
          // ANDROID NATIVE
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
              const response = {
                razorpay_payment_id: responseObj.razorpay_payment_id,
              };
              verifyPayment(response, data._id);
            },
            (error) => {
              setIsProcessing(false);
              alert(`Payment Failed: ${JSON.stringify(error)}`);
            }
          );
        } else {
          // WEB
          // Web ke liye hum normal naam use karenge
          const webOptions = { ...options, name: "SwadKart" };
          const loadRazorpayScript = () =>
            new Promise((resolve) => {
              const s = document.createElement("script");
              s.src = "https://checkout.razorpay.com/v1/checkout.js";
              s.onload = () => resolve(true);
              document.body.appendChild(s);
            });
          await loadRazorpayScript();
          const rzp = new window.Razorpay({
            ...webOptions,
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

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center text-white backdrop-blur-sm">
        {paymentSuccess ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500 rounded-full p-4 shadow-[0_0_30px_rgba(34,197,94,0.6)] mb-4">
              <CheckCircle size={64} className="text-white animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-green-400">
              Payment Successful!
            </h2>
            <p className="text-gray-400 mt-2">Placing your order...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-gray-800 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
                <span className="text-2xl font-bold text-primary">₹</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold animate-pulse">
              Processing Payment...
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              Please do not close the app
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-10">
      <CheckoutSteps step1 step2 step3 step4 />
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 mt-8">
        {/* Same UI code as before... */}
        <div className="lg:w-2/3 space-y-6">
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
                "Processing..."
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
