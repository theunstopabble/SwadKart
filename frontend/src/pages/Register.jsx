import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader, // Changed from Loader2 to match Login
  KeyRound,
  RefreshCw,
  ShieldCheck,
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
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800">
        {/* Header Section */}
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">
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

        <p className="text-gray-400 text-center mb-6 text-sm">
          {otpSent
            ? `Code sent to ${email}`
            : "Create an account to start ordering"}
        </p>

        {!otpSent ? (
          /* Registration Form */
          <form onSubmit={submitHandler} className="space-y-5">
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
              <div key={idx} className="relative">
                <field.icon
                  className="absolute left-4 top-3.5 text-gray-500"
                  size={20}
                />
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-600"
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
              className="w-full bg-primary hover:bg-red-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : (
                <>
                  Get OTP <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Form */
          <form onSubmit={verifyOtpHandler} className="space-y-6">
            <div className="relative">
              <KeyRound
                className="absolute left-4 top-3.5 text-primary"
                size={24}
              />
              <input
                type="text"
                placeholder="• • • • • •"
                className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-primary/50 text-white text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:border-primary transition-all placeholder:text-gray-700"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : (
                <>
                  Verify & Login <ShieldCheck size={20} />
                </>
              )}
            </button>

            {/* OTP Actions */}
            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
              >
                ← Change Email
              </button>

              <button
                type="button"
                disabled={timer > 0 || isLoading}
                onClick={() => submitHandler()}
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  timer > 0
                    ? "text-gray-600"
                    : "text-primary hover:text-red-400"
                }`}
              >
                <RefreshCw
                  size={12}
                  className={timer > 0 ? "animate-spin" : ""}
                />
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <p className="text-gray-400 text-center mt-8 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
