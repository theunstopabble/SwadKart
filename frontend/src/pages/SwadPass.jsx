import React, { useState, useEffect } from "react";
import axios from "axios";
import { BASEURL } from "../config";
import {
  Crown,
  Check,
  X,
  Truck,
  Zap,
  Percent,
  Clock,
  Loader,
} from "lucide-react";

const SwadPass = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get(`${BASEURL}/api/v1/swadpass/status`, {
        withCredentials: true,
      });
      setStatus(data);
    } catch {
      setStatus({ active: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubscribe = async () => {
    setActionLoading(true);
    setMessage("");
    try {
      const { data } = await axios.post(
        `${BASEURL}/api/v1/swadpass/subscribe`,
        {},
        { withCredentials: true }
      );
      setMessage(data.message || "Subscribed successfully!");
      setMessageType("success");
      fetchStatus();
    } catch (e) {
      setMessage(e.response?.data?.message || "Subscription failed");
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setMessage("");
    try {
      const { data } = await axios.post(
        `${BASEURL}/api/v1/swadpass/cancel`,
        {},
        { withCredentials: true }
      );
      setMessage(data.message || "Cancelled successfully");
      setMessageType("success");
      fetchStatus();
    } catch (e) {
      setMessage(e.response?.data?.message || "Cancellation failed");
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <Loader className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Crown className="text-yellow-400" size={32} />
          <h1 className="text-3xl font-bold">SwadPass</h1>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              messageType === "error"
                ? "bg-red-900/50 text-red-200"
                : "bg-green-900/50 text-green-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <Truck className="text-blue-400 mb-3" size={24} />
            <h3 className="font-semibold text-lg mb-1">Free Delivery</h3>
            <p className="text-gray-400 text-sm">
              Unlimited free delivery on all orders
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <Percent className="text-purple-400 mb-3" size={24} />
            <h3 className="font-semibold text-lg mb-1">Exclusive Discounts</h3>
            <p className="text-gray-400 text-sm">Extra 10% off every order</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <Zap className="text-yellow-400 mb-3" size={24} />
            <h3 className="font-semibold text-lg mb-1">Priority Support</h3>
            <p className="text-gray-400 text-sm">Fast-track customer service</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <Clock className="text-green-400 mb-3" size={24} />
            <h3 className="font-semibold text-lg mb-1">Early Access</h3>
            <p className="text-gray-400 text-sm">New restaurants & deals first</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
          {status?.active ? (
            <>
              <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                <Check size={24} />
                <span className="text-xl font-semibold">Active Subscription</span>
              </div>
              <p className="text-gray-400 mb-2">
                Valid until: {new Date(status.expiresAt).toLocaleDateString()}
              </p>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {actionLoading ? <Loader className="animate-spin" size={18} /> : <X size={18} />}
                Cancel Subscription
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-gray-400 mb-4">
                <X size={24} />
                <span className="text-xl font-semibold">No Active Plan</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                ₹{status?.plan?.price || 199}
                <span className="text-sm text-gray-400 font-normal">/month</span>
              </p>
              <button
                onClick={handleSubscribe}
                disabled={actionLoading}
                className="mt-6 px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {actionLoading ? <Loader className="animate-spin" size={18} /> : <Crown size={18} />}
                Subscribe Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwadPass;
