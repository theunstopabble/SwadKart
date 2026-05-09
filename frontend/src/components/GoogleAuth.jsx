import React, { useState } from "react";
import { auth, googleProvider } from "../utils/firebaseConfig";
import { signInWithPopup } from "firebase/auth";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setCredentials } from "../redux/userSlice";
import { useNavigate } from "react-router-dom";
import { BASEURL } from "../config";
import { Phone, ArrowRight, X } from "lucide-react";

// ✅ FIX: Google Icon ka SVG Code (No External Image Link)
const GoogleIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GoogleAuth = () => {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempGoogleUser, setTempGoogleUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 1. Google Popup Handle
  const handleGoogleClick = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const res = await fetch(`${BASEURL}/api/v1/users/google-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();

      if (data.exists) {
        dispatch(setCredentials(data.user));
        toast.success(`Welcome back, ${data.user.name}!`);
        navigate("/");
      } else {
        setTempGoogleUser({
          name: user.displayName,
          email: user.email,
          image: user.photoURL,
        });
        setShowPhoneModal(true);
      }
    } catch {
      toast.error("Server Error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalRegister = async () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return toast.error("Please enter a valid 10-digit Indian phone number");
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASEURL}/api/v1/users/google-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: tempGoogleUser.name,
          email: tempGoogleUser.email,
          image: tempGoogleUser.image,
          phone: phoneNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(setCredentials(data));
        toast.success(`Welcome to SwadKart, ${data.name}! 🎉`);
        setShowPhoneModal(false);
        navigate("/");
      } else {
        toast.error(data.message || "Registration Failed");
      }
    } catch {
      toast.error("Network Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* --- The Button (Updated with SVG Icon) --- */}
      <button
        type="button"
        onClick={handleGoogleClick}
        className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all border border-gray-300 shadow-lg active:scale-95"
      >
        {/* Yahan ab hum direct Component use kar rahe hain */}
        <GoogleIcon />
        <span className="text-sm uppercase tracking-wider">
          Continue with Google
        </span>
      </button>

      {/* --- Phone Modal --- */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black italic uppercase text-white mb-2">
              One Last <span className="text-primary">Step</span> 📞
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
              Phone number is mandatory for delivery updates.
            </p>

            <div className="space-y-4">
              <div className="relative group">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  className="w-full bg-black border border-gray-800 p-4 pl-12 rounded-xl text-white outline-none focus:border-primary font-bold tracking-widest transition-all"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <button
                onClick={handleFinalRegister}
                disabled={loading}
                className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    Complete Setup <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleAuth;
