import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios"; // 👈 Using Axios for better handling
import { toast } from "react-toastify";
import {
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  Phone,
  Navigation,
} from "lucide-react";
import { BASE_URL } from "../config"; // 👈 Import Config

const DeliveryPartnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 1. FETCH ASSIGNED DELIVERIES
  // ==========================================
  const fetchMyDeliveries = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };
      // Matches Backend Route: /api/v1/orders/my-deliveries
      const { data } = await axios.get(
        `${BASE_URL}/api/v1/orders/my-deliveries`,
        config
      );
      setTasks(data);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) fetchMyDeliveries();
  }, [userInfo]);

  // ==========================================
  // 2. HANDLE ACCEPT / REJECT
  // ==========================================
  const handleDeliveryAction = async (id, action) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };
      // Matches Backend Route: /:id/delivery-action
      await axios.put(
        `${BASE_URL}/api/v1/orders/${id}/delivery-action`,
        { action }, // 'accept' or 'reject'
        config
      );

      toast.success(`Order ${action}ed successfully!`);
      fetchMyDeliveries(); // Refresh list to update UI
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    }
  };

  // ==========================================
  // 3. MARK AS DELIVERED
  // ==========================================
  const markAsDelivered = async (id) => {
    if (!window.confirm("Confirm delivery completion?")) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };
      // Matches Backend Route: /:id/deliver
      await axios.put(`${BASE_URL}/api/v1/orders/${id}/deliver`, {}, config);

      toast.success("Order Delivered Successfully! 🚀");
      fetchMyDeliveries();
    } catch (error) {
      console.error(error);
      toast.error("Error updating status");
    }
  };

  // Helper to open Google Maps
  const openMaps = (address, city) => {
    const query = encodeURIComponent(`${address}, ${city}`);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <Truck className="text-blue-500 h-10 w-10" />
            Delivery Dashboard
          </h1>
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 to-gray-900/40 backdrop-blur-xl p-8 rounded-3xl border border-blue-500/20 shadow-xl mb-10">
          <h2 className="text-2xl font-bold mb-2">
            Welcome, {userInfo?.name}! 👋
          </h2>
          <div className="inline-flex items-center gap-3 bg-black/30 px-5 py-2 rounded-full border border-green-500/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-bold text-green-400 text-sm">Online</span>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 pl-2 border-l-4 border-blue-500">
          Active Tasks
        </h3>

        {loading ? (
          <div className="text-center py-10 animate-pulse">
            Loading your tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-gray-500 text-center py-10">
            No active deliveries assigned yet.
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task) => (
              <div
                key={task._id}
                className={`rounded-2xl overflow-hidden border transition-all ${
                  task.orderStatus === "Delivered"
                    ? "bg-gray-900/40 border-green-500/20 opacity-70"
                    : "bg-gray-900/80 border-blue-500/50 shadow-blue-500/10"
                }`}
              >
                {/* CARD HEADER */}
                <div className="px-6 py-3 bg-gray-800/50 flex justify-between items-center">
                  <span className="font-bold">
                    #{task._id.substring(task._id.length - 6).toUpperCase()}
                  </span>

                  {/* DYNAMIC STATUS BADGE */}
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      task.deliveryStatus === "Assigned"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : task.deliveryStatus === "Accepted"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {task.deliveryStatus === "Assigned"
                      ? "Wait for Response"
                      : task.deliveryStatus === "Accepted"
                      ? "In Progress"
                      : "Completed"}
                  </span>
                </div>

                <div className="p-6 md:flex justify-between items-start gap-6">
                  {/* LEFT: INFO */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase mb-1">
                        Deliver To
                      </p>
                      <h4 className="text-lg font-bold text-white">
                        {task.shippingAddress?.fullName || task.user?.name}
                      </h4>

                      {/* Address Link */}
                      <div
                        onClick={() =>
                          openMaps(
                            task.shippingAddress?.address,
                            task.shippingAddress?.city
                          )
                        }
                        className="flex items-start gap-2 text-gray-300 mt-2 cursor-pointer hover:text-blue-400 transition-colors"
                      >
                        <MapPin
                          size={18}
                          className="text-blue-500 shrink-0 mt-0.5"
                        />
                        <p>
                          {task.shippingAddress?.address},{" "}
                          {task.shippingAddress?.city}
                          <span className="block text-xs text-blue-500 font-bold mt-1">
                            Click to Navigate
                          </span>
                        </p>
                      </div>

                      {/* Phone Link */}
                      <a
                        href={`tel:${task.shippingAddress?.phone}`}
                        className="flex items-center gap-2 text-gray-300 mt-3 hover:text-green-400 transition-colors"
                      >
                        <Phone size={18} className="text-green-500 shrink-0" />
                        <span className="font-mono">
                          {task.shippingAddress?.phone}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* RIGHT: ACTION BUTTONS */}
                  <div className="mt-6 md:mt-0 flex flex-col gap-3 min-w-[200px]">
                    {/* CASE 1: New Assignment (Accept/Reject) */}
                    {task.deliveryStatus === "Assigned" && (
                      <>
                        <button
                          onClick={() =>
                            handleDeliveryAction(task._id, "accept")
                          }
                          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                        >
                          <CheckCircle2 size={20} /> Accept
                        </button>
                        <button
                          onClick={() =>
                            handleDeliveryAction(task._id, "reject")
                          }
                          className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                          <XCircle size={20} /> Reject
                        </button>
                      </>
                    )}

                    {/* CASE 2: Accepted (Mark Delivered) */}
                    {task.deliveryStatus === "Accepted" &&
                      task.orderStatus !== "Delivered" && (
                        <button
                          onClick={() => markAsDelivered(task._id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                        >
                          <CheckCircle2 size={20} /> Mark Delivered
                        </button>
                      )}

                    {/* CASE 3: Completed */}
                    {task.orderStatus === "Delivered" && (
                      <button
                        disabled
                        className="bg-gray-800 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed border border-gray-700"
                      >
                        Task Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
