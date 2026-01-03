import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader2,
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
    <div className="min-h-screen relative flex items-center justify-center bg-black overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[450px] mx-4">
        {/* Brand Logo */}
        <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-2xl">
            Swad<span className="text-primary">Kart</span>
          </h1>
          
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl shadow-primary/10 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-wide flex items-center justify-center gap-2">
              {otpSent ? (
                <>
                  <ShieldCheck className="text-green-500" /> Verify Identity
                </>
              ) : (
                "Create Account"
              )}
            </h2>
            <p className="text-xs font-medium text-gray-400 mt-2">
              {otpSent
                ? `Enter the code sent to ${email}`
                : "Join the food revolution today!"}
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={submitHandler} className="space-y-4">
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
                    <field.icon className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                  </div>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-600 font-medium"
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
                className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Get OTP <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtpHandler} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <input
                  type="text"
                  placeholder="• • • • • •"
                  className="w-full bg-black/60 border border-primary/30 text-white text-3xl font-black text-center rounded-2xl py-5 pl-12 tracking-[0.5em] focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(255,71,87,0.3)] transition-all placeholder:text-gray-700"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Verify & Login"
                )}
              </button>

              <div className="flex justify-between items-center px-2">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
                >
                  ← Edit Email
                </button>

                <button
                  type="button"
                  disabled={timer > 0 || isLoading}
                  onClick={() => submitHandler()}
                  className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    timer > 0
                      ? "text-gray-600"
                      : "text-primary hover:text-red-400"
                  }`}
                >
                  <RefreshCw
                    size={10}
                    className={timer > 0 ? "animate-spin" : ""}
                  />
                  {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-gray-500 text-xs font-medium">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-white font-bold hover:text-primary transition-colors"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
