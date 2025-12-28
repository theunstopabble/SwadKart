import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config";
import { setCredentials } from "../redux/userSlice";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP & Timer States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    if (userInfo) navigate("/");
  }, [navigate, userInfo]);

  // Timer logic for Resend OTP
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const submitHandler = async (e) => {
    if (e) e.preventDefault();
    if (!name || !email || !phone || !password || !confirmPassword) {
      toast.error("🚫 All fields are mandatory!");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("❌ Passwords do not match");
      return;
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("📞 Invalid Phone Number!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();

      // ✅ Checking res.ok matches our new Backend Logic
      if (res.ok) {
        setOtpSent(true);
        setTimer(30); // Start 30s resend timer
        setOtp(""); // Clear previous OTP if any (UX Improvement)
        toast.success(data.message || "OTP sent to your email! 📧");
      } else {
        toast.error(data.message || "Registration Failed");
      }
    } catch (err) {
      toast.error("Server Error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtpHandler = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("❌ Please enter a valid 6-digit OTP");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("🎉 Welcome to SwadKart!");
        dispatch(setCredentials(data));
        navigate("/");
      } else {
        toast.error(data.message || "Invalid or Expired OTP");
      }
    } catch (err) {
      toast.error("Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-gray-800 animate-in fade-in zoom-in-95 duration-500">
        <h2 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter italic">
          {otpSent ? (
            "Security Check 🔐"
          ) : (
            <>
              Join <span className="text-primary tracking-tight">Swad</span>Kart
            </>
          )}
        </h2>
        <p className="text-gray-500 text-center mb-8 text-sm font-medium">
          {otpSent
            ? `We sent a 6-digit code to ${email}`
            : "Create an account to start your food journey"}
        </p>

        {!otpSent ? (
          <form onSubmit={submitHandler} className="space-y-4">
            {/* Inputs styling consistent with Profile/Login */}
            {[
              {
                icon: User,
                type: "text",
                placeholder: "Full Name",
                val: name,
                set: setName,
              },
              {
                icon: Mail,
                type: "email",
                placeholder: "Gmail Address",
                val: email,
                set: setEmail,
              },
              {
                icon: Phone,
                type: "tel",
                placeholder: "Phone Number",
                val: phone,
                set: setPhone,
              },
              {
                icon: Lock,
                type: "password",
                placeholder: "Password",
                val: password,
                set: setPassword,
              },
              {
                icon: Lock,
                type: "password",
                placeholder: "Confirm Password",
                val: confirmPassword,
                set: setConfirmPassword,
              },
            ].map((input, i) => (
              <div key={i} className="relative group">
                <input.icon
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors"
                  size={18}
                />
                <input
                  type={input.type}
                  placeholder={input.placeholder}
                  className="w-full pl-12 p-4 rounded-2xl bg-black/50 border border-gray-800 text-white focus:border-primary/50 focus:outline-none transition-all font-bold placeholder:text-gray-700 placeholder:font-normal"
                  value={input.val}
                  onChange={(e) => input.set(e.target.value)}
                  required
                  {...(input.placeholder === "Phone Number"
                    ? { maxLength: 10 }
                    : {})}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2 shadow-xl shadow-primary/20"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : (
                <>
                  Send OTP <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-gray-500 text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em]">
              Already a member?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtpHandler} className="space-y-8">
            <div className="relative group">
              <KeyRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary"
                size={20}
              />
              <input
                type="text"
                placeholder="6-Digit OTP"
                className="w-full pl-12 p-5 rounded-2xl bg-black/50 border border-gray-800 text-white text-center text-2xl font-black tracking-[0.5em] focus:border-primary/50 outline-none"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl shadow-green-500/20"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : (
                "Verify Account"
              )}
            </button>

            <div className="flex flex-col gap-4 text-center">
              <button
                type="button"
                disabled={timer > 0 || isLoading}
                onClick={() => submitHandler()}
                className="text-primary text-[10px] font-black uppercase tracking-widest disabled:text-gray-700 flex items-center justify-center gap-2"
              >
                <RefreshCw
                  size={12}
                  className={timer > 0 ? "animate-spin" : ""}
                />
                {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP Now"}
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest"
              >
                Wrong Email? Go Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
