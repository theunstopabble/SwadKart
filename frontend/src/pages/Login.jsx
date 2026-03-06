import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { setCredentials } from "../redux/userSlice";
import { Mail, Lock, LogIn, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config";

// Lazy load GoogleAuth to keep Firebase out of main bundle
import { lazy, Suspense } from "react";
const GoogleAuth = lazy(() => import("../components/GoogleAuth"));

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    if (userInfo) {
      navigate("/");
    }
  }, [userInfo, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        dispatch(setCredentials(data));

        // 🔐 AUTO-RESTORE BIOMETRIC (Industry Standard)
        // After login, check if user had biometric enabled
        try {
          const bioRes = await axios.get(
            `${BASE_URL}/api/v1/users/profile/biometric-status`,
            { headers: { Authorization: `Bearer ${data.token}` } }
          );

          // If user has biometric enabled AND has registered credentials
          if (bioRes.data.isBiometricEnabled && bioRes.data.hasCredentials) {
            localStorage.setItem("isBiometricEnabled", "true");
            console.log("🔐 Biometric auto-restored for returning user");
          }
        } catch (bioErr) {
          console.log("Biometric status check skipped:", bioErr.message);
        }

        toast.success("Login Successful! Welcome back. 👋");
        navigate("/");
      } else {
        toast.error(data.message || "Invalid Email or Password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">
          Hungry? Let's get you
          <br />
          <span className="text-primary tracking-tight">Swad</span>Kart
        </h2>
        <br />

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
            className="w-full bg-primary hover:bg-red-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
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
        <div className="my-6 flex items-center gap-4 opacity-50">
          <div className="flex-1 h-[1px] bg-gray-700"></div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            OR
          </span>
          <div className="flex-1 h-[1px] bg-gray-700"></div>
        </div>

        {/* The Magic Button */}
        <Suspense fallback={<div className="h-[56px] w-full bg-gray-800 animate-pulse rounded-2xl border border-gray-700"></div>}>
          <GoogleAuth />
        </Suspense>

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
