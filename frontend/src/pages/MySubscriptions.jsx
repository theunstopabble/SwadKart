import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Loader,
  UtensilsCrossed,
  Leaf,
  AlertCircle,
} from "lucide-react";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";

const MySubscriptions = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) { setLoading(false); return; }
    fetch(`${BASEURL}/api/v1/subscriptions/my`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        setSubs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setSubs([]);
        toast.error("Failed to load subscriptions");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userInfo]);

  const action = async (id, type) => {
    try {
      const res = await fetch(`${BASEURL}/api/v1/subscriptions/${id}/${type === "pause" ? "pause" : type === "resume" ? "resume" : "cancel"}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast.success(type === "pause" ? "Subscription paused" : type === "resume" ? "Subscription resumed" : "Subscription cancelled");
        const updated = await res.json();
        setSubs((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status: updated.subscription?.status || s.status } : s)),
        );
      } else {
        toast.error("Action failed");
      }
    } catch {
      toast.error("Network error performing action");
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: "bg-green-500/10 text-green-400 border-green-500/20",
      paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
      expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${map[status] || map.expired}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-10 px-4 md:px-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mb-2">
          My <span className="text-primary">Subscriptions</span>
        </h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mb-8">
          Daily & weekly meal plans
        </p>

        {subs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-10 text-center">
            <UtensilsCrossed size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-bold mb-4">No active subscriptions</p>
            <Link to="/" className="inline-block bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all">
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((sub) => (
              <div
                key={sub._id}
                className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 hover:border-primary/30 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black italic">{sub.planName}</h3>
                      {statusBadge(sub.status)}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {sub.planType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {sub.schedule?.days?.length || 0} days/week
                      </span>
                      {sub.preferences?.isVeg && (
                        <span className="flex items-center gap-1 text-green-400">
                          <Leaf size={12} /> Veg
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black italic text-primary">
                      ₹{sub.pricing?.totalPrice?.toLocaleString() || 0}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                      ₹{sub.pricing?.perMealPrice}/meal
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {sub.schedule?.days?.map((d) => (
                    <span
                      key={d}
                      className="bg-gray-800 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-300 uppercase"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {sub.status === "active" && (
                    <button
                      onClick={() => action(sub._id, "pause")}
                      className="flex items-center gap-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500/20 transition-all"
                    >
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  {sub.status === "paused" && (
                    <button
                      onClick={() => action(sub._id, "resume")}
                      className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-all"
                    >
                      <Play size={14} /> Resume
                    </button>
                  )}
                  {(sub.status === "active" || sub.status === "paused") && (
                    <button
                      onClick={() => {
                        if (window.confirm("Cancel this subscription?")) action(sub._id, "cancel");
                      }}
                      className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubscriptions;
