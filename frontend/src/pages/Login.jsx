import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../redux/userSlice";
import { Mail, Lock, LogIn, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../config";

const redirectByRole = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "restaurant_owner") return "/restaurant/dashboard";
  if (role === "delivery_partner") return "/delivery/dashboard";
  return "/";
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    if (userInfo) {
      navigate(redirectByRole(userInfo.role));
    }
  }, [userInfo, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch(`${BASEURL}/api/v1/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        if (err.message && err.message.toLowerCase().includes("not verified")) {
          toast.error("Email not verified! Redirecting to verify OTP...", { duration: 3000 });
          setTimeout(() => {
            navigate("/register", { state: { email: cleanEmail, resendOtp: true } });
          }, 1200);
        } else {
          toast.error(err.message || "Invalid Email or Password");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Clear any stale biometric locks so app is immediately accessible
      if (typeof window !== "undefined") {
        if (window.sessionStorage) {
          sessionStorage.setItem("biometricUnlocked", "true");
        }
        localStorage.removeItem("isBiometricEnabled");
      }

      dispatch(setCredentials(data));
      toast.success(`Welcome back, ${data.name || "Foodie"}! 👋`);

      const targetPath = redirectByRole(data.role);
      navigate(targetPath);
    } catch {
      toast.error("Network Error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">
          Hungry? Let's get you
          <br />
          <span className="text-primary tracking-tight">Swad</span>Kart
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Sign in with your email and password
        </p>

        <form onSubmit={submitHandler} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-primary focus:outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-primary focus:outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Quick Demo Credentials */}
          <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/50 space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-center">
              Quick Fill Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@swadkart.com");
                  setPassword("Password123!");
                }}
                className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer"
              >
                👑 Demo Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("customer@swadkart.com");
                  setPassword("Password123!");
                }}
                className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 text-xs py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer"
              >
                👤 Demo Customer
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              to="/password/forgot"
              className="text-primary hover:text-red-400 text-sm font-bold transition-all"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-red-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader className="animate-spin" />
            ) : (
              <>
                Login <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-8 text-sm">
          Hungry for more?{" "}
          <Link
            to="/register"
            className="text-primary font-bold hover:underline"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
