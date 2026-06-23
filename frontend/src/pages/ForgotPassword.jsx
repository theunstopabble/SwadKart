import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  Loader,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { BASEURL } from "../config";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${BASEURL}/api/v1/users/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessage("Success! Check your inbox for the reset link.");
        setEmail("");
      } else {
        setError(data.message || "Email not found in our records.");
      }
    } catch {
      setError("System error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      {/* Premium Card Layout - Matched with Login DNA */}
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        {/* Header Icon - Premium Styled */}
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
            <ShieldCheck size={40} className="text-primary" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center mb-2 uppercase tracking-tighter italic">
          Reset <span className="text-primary">Password</span>
        </h2>
        <p className="text-gray-500 text-center mb-8 font-medium text-sm leading-relaxed italic">
          Forgot your security key? Enter your email and we'll send a
          <span className="text-white font-bold"> Magic Link</span> to recover
          it.
        </p>

        {/* Status Messages - Polished */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-widest">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-widest">
            <ShieldCheck size={16} /> {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-500 text-[10px] font-extrabold uppercase tracking-[0.3em] mb-3 ml-1">
              Registered Email
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors"
                size={20}
              />
              <input
                type="email"
                required
                className="w-full bg-black/50 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-bold placeholder:text-gray-600 placeholder:font-normal"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button - Now Primary Red like Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-red-600 text-white font-extrabold py-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-3 shadow-lg shadow-primary/25 uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95"
          >
            {loading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <>
                Recover Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800 pt-6">
          <Link
            to="/login"
            className="text-gray-500 hover:text-primary text-[10px] font-extrabold uppercase tracking-widest transition-all"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
