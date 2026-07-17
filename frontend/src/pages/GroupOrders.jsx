import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";
import {
  Users,
  Plus,
  X,
  Link,
  Copy,
  Check,
  Clock,
  Loader,
  Utensils,
} from "lucide-react";

const GroupOrders = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    restaurant: "",
    expiresAtMinutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await axios.get(
        `${BASEURL}/api/v1/group-orders/my`,
        { withCredentials: true }
      );
      // axios throws on non-2xx; auth errors handled in catch
      setOrders(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      setOrders([]);
      if (err.response?.status !== 401) {
        toast.error("Failed to load group orders");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userInfo) { setLoading(false); return; }
    fetchOrders();
  }, [userInfo]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const { data } = await axios.post(
        `${BASEURL}/api/v1/group-orders`,
        {
          restaurant: form.restaurant,
          expiresAt: new Date(
            Date.now() + form.expiresAtMinutes * 60000
          ).toISOString(),
        },
        { withCredentials: true }
      );
      setMessage(`Group order created! Code: ${data.inviteCode}`);
      setShowForm(false);
      setForm({ restaurant: "", expiresAtMinutes: 30 });
      fetchOrders();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create group order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (inviteCode) => {
    try {
      await axios.post(
        `${BASEURL}/api/v1/group-orders/join`,
        { inviteCode },
        { withCredentials: true }
      );
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join");
    }
  };

  const copyCode = (code) => {
    const done = () => { setCopied(code); setTimeout(() => setCopied(""), 2000); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done).catch(() => toast.error("Copy failed"));
    } else {
      try {
        const el = document.createElement("textarea");
        el.value = code; document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el); done();
      } catch { toast.error("Copy not supported"); }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <Loader className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="text-blue-400" size={32} />
            <h1 className="text-3xl font-bold">Group Orders</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-red-600 rounded-lg font-medium transition"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Close" : "Create Group"}
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.includes("Failed")
                ? "bg-red-900/50 text-red-200"
                : "bg-green-900/50 text-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Restaurant ID
                </label>
                <input
                  type="text"
                  required
                  value={form.restaurant}
                  onChange={(e) =>
                    setForm({ ...form, restaurant: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Restaurant ID"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Expires In (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  required
                  value={form.expiresAtMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAtMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary hover:bg-red-600 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <Users size={18} />
              )}
              Create Group Order
            </button>
          </form>
        )}

        {orders.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
            <Utensils className="mx-auto text-gray-600 mb-3" size={48} />
            <p className="text-gray-400 text-lg">No group orders</p>
            <p className="text-gray-500 text-sm mt-1">
              Start a group order to split the bill with friends
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o._id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.status === "open"
                          ? "bg-green-900 text-green-300"
                          : o.status === "cancelled"
                          ? "bg-red-900 text-red-300"
                          : "bg-blue-900 text-blue-300"
                      }`}
                    >
                      {o.status}
                    </span>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={14} />
                      Expires: {o.expiresAt ? new Date(o.expiresAt).toLocaleTimeString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCode(o.inviteCode)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
                    >
                      {copied === o.inviteCode ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copied === o.inviteCode ? "Copied" : o.inviteCode}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users size={16} />
                  {o.members?.length || 1} member
                  {o.members?.length !== 1 ? "s" : ""}
                </div>
                {o.status === "open" && (
                  <button
                    onClick={() => handleJoin(o.inviteCode)}
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                  >
                    <Link size={14} /> Join this group
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupOrders;
