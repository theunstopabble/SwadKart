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
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config";
import { setCredentials } from "../redux/userSlice";

// Lazy load GoogleAuth to keep Firebase out of main bundle
import { lazy, Suspense } from "react";
const GoogleAuth = lazy(() => import("../components/GoogleAuth"));

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      return toast.error("🚫 All fields are mandatory!");
    }
    if (password !== confirmPassword) {
      return toast.error("❌ Passwords do not match");
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return toast.error("📞 Invalid Phone Number!");
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setTimer(30);
        setOtp("");
        toast.success(data.message || "OTP sent successfully! 📧");
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
    if (otp.length !== 6) return toast.error("❌ Enter valid 6-digit OTP");

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
        toast.error(data.message || "Invalid OTP");
      }
    } catch (err) {
      toast.error("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black px-4 pt-28 pb-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-900/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-800">
        {/* Header Section */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            {otpSent ? (
              <>
                Verify <span className="text-green-500">Identity</span>
              </>
            ) : (
              <>
                Hungry? Join <br />
                <span className="text-primary tracking-tight">Swad</span>Kart
              </>
            )}
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            {otpSent
              ? `Code sent to ${email}`
              : "Create an account to start ordering"}
          </p>
        </div>

        {!otpSent ? (
          /* Registration Form */
          <>
            <form onSubmit={submitHandler} className="mt-8 space-y-4">
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
                  placeholder: "Email Address",
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
              ].map((field, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <field.icon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                    value={field.val}
                    onChange={(e) => field.set(e.target.value)}
                    required
                    maxLength={
                      field.placeholder === "Phone Number" ? 10 : undefined
                    }
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? (
                  <Loader className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    Get OTP <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* 👇 GOOGLE AUTH SECTION ADDED HERE */}
            <div className="my-6 flex items-center gap-4 opacity-50">
              <div className="flex-1 h-[1px] bg-gray-700"></div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                OR
              </span>
              <div className="flex-1 h-[1px] bg-gray-700"></div>
            </div>

            <Suspense fallback={<div className="h-[56px] w-full bg-gray-800 animate-pulse rounded-2xl border border-gray-700"></div>}>
              <GoogleAuth />
            </Suspense>
            {/* 👆 GOOGLE AUTH END */}
          </>
        ) : (
          /* OTP Form */
          <form onSubmit={verifyOtpHandler} className="mt-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <input
                type="text"
                placeholder="• • • • • •"
                className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-primary/50 rounded-xl text-center text-white text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-gray-700"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-lg shadow-green-600/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                <>
                  Verify & Login <ShieldCheck className="ml-2 h-5 w-5" />
                </>
              )}
            </button>

            {/* OTP Actions */}
            <div className="flex justify-between items-center text-sm px-1">
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="font-semibold text-gray-500 hover:text-white transition-colors"
              >
                ← Change Email
              </button>

              <button
                type="button"
                disabled={timer > 0 || isLoading}
                onClick={() => submitHandler()}
                className={`font-bold flex items-center gap-1.5 ${timer > 0
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-primary hover:text-red-400 cursor-pointer"
                  }`}
              >
                <RefreshCw
                  size={14}
                  className={timer > 0 ? "animate-spin" : ""}
                />
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center border-t border-gray-800 pt-6">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-primary hover:text-white transition-colors"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
