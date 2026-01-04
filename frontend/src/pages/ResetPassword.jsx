import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, Save, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../config";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error("❌ Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/users/password/reset/${token}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmPassword }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("✅ Password updated! Redirecting to Login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(data.message || "❌ Invalid or Expired Token");
      }
    } catch (err) {
      toast.error("❌ Server Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl transition-all hover:border-gray-700">
        {/* Header - Styled like Login */}
        <h2 className="text-3xl font-extrabold text-center mb-2 tracking-tight">
          Reset <span className="text-primary">Password</span> 🔐
        </h2>
        <p className="text-gray-500 text-center text-xs font-bold uppercase tracking-[0.2em] mb-8">
          Secure your access to SwadKart
        </p>

        <form onSubmit={submitHandler} className="space-y-6">
          {/* New Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="password"
              placeholder="New Password"
              className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-600 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full pl-12 p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white focus:border-primary focus:outline-none transition-all placeholder:text-gray-600 font-medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button - Matched with Login Primary Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-red-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <>
                Update Password <Save size={20} />
              </>
            )}
          </button>
        </form>

        {/* Info Text */}
        <p className="text-gray-600 text-center mt-8 text-[10px] font-bold uppercase tracking-widest">
          SwadKart Security Protocol v2.0
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
