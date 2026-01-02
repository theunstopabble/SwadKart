import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { savePaymentMethod } from "../redux/cartSlice";
import CheckoutSteps from "../components/CheckoutSteps";
import { CreditCard, Banknote, ArrowRight, ShieldCheck } from "lucide-react";

const Payment = () => {
  const { shippingAddress } = useSelector((state) => state.cart);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [paymentMethod, setPaymentMethod] = useState("Online");

  // Redirect if address is missing
  useEffect(() => {
    if (!shippingAddress || !shippingAddress.address) {
      navigate("/shipping");
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod(paymentMethod));
    navigate("/placeorder");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-10 pb-20 font-sans">
      <CheckoutSteps step1 step2 step3 />

      <div className="max-w-xl mx-auto mt-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3">
            <CreditCard className="text-primary" size={32} /> Payment{" "}
            <span className="text-primary">Mode</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2 pl-2">
            Choose how you want to pay
          </p>
        </header>

        <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-900 shadow-2xl space-y-8 relative overflow-hidden">
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-green-500/60 mb-2">
            <ShieldCheck size={14} /> 256-bit Secure Transaction
          </div>

          <form onSubmit={submitHandler} className="space-y-4">
            {/* Online Payment Option */}
            <label
              className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                paymentMethod === "Online"
                  ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(255,193,7,0.1)]"
                  : "bg-black border-gray-900 hover:border-gray-800"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online"
                  checked={paymentMethod === "Online"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-6 h-6 accent-primary cursor-pointer"
                />
              </div>
              <div
                className={`p-3 rounded-2xl transition-colors ${
                  paymentMethod === "Online"
                    ? "bg-primary text-black"
                    : "bg-gray-900 text-gray-500"
                }`}
              >
                <CreditCard size={24} />
              </div>
              <div className="flex-1">
                <span className="block font-black uppercase italic tracking-tight text-lg">
                  Online Payment
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Razorpay • UPI • Cards • Wallets
                </span>
              </div>
            </label>

            {/* COD Option */}
            <label
              className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                paymentMethod === "COD"
                  ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(255,193,7,0.1)]"
                  : "bg-black border-gray-900 hover:border-gray-800"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-6 h-6 accent-primary cursor-pointer"
                />
              </div>
              <div
                className={`p-3 rounded-2xl transition-colors ${
                  paymentMethod === "COD"
                    ? "bg-primary text-black"
                    : "bg-gray-900 text-gray-500"
                }`}
              >
                <Banknote size={24} />
              </div>
              <div className="flex-1">
                <span className="block font-black uppercase italic tracking-tight text-lg">
                  Cash on Delivery
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Pay when you receive your food
                </span>
              </div>
            </label>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl shadow-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-primary/20 group"
              >
                Next Step: Review Order{" "}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-2 transition-transform"
                />
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-8 px-10 leading-loose">
          By continuing, you agree to our terms of service and payment policies.
        </p>
      </div>
    </div>
  );
};

export default Payment;
