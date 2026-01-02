import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import {
  Truck,
  Package,
  DollarSign,
  ListChecks,
  Loader2,
  Signal,
} from "lucide-react";
import { BASE_URL } from "../config";

// Modular Components
import DeliveryCard from "../components/delivery/DeliveryCard";
import EarningsHistory from "../components/delivery/EarningsHistory";

// 🔌 Socket Connection
const socket = io(BASE_URL);

const DeliveryPartnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

  // --- States ---
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});

  // --- Fetch Logic (Optimized) ---
  const fetchMyDeliveries = useCallback(async () => {
    if (!userInfo || !userInfo.token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/orders/my-deliveries`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Sort: Active tasks on top
        const sortedTasks = (data || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setTasks(sortedTasks);
      }
    } catch (error) {
      toast.error("Radar Sync Failed: Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  useEffect(() => {
    if (!userInfo) return navigate("/login");

    fetchMyDeliveries();

    // 📡 Socket Events
    socket.emit("joinOrder", userInfo._id);

    // Listen for new assignments
    socket.on("orderAssigned", () => {
      toast.success("🚀 NEW MISSION ASSIGNED!", {
        duration: 5000,
        icon: "🛵",
        style: {
          borderRadius: "15px",
          background: "#1e293b",
          color: "#fff",
          border: "1px solid #3b82f6",
        },
      });
      fetchMyDeliveries();
    });

    return () => {
      socket.off("orderAssigned");
    };
  }, [userInfo, navigate, fetchMyDeliveries]);

  // --- Handlers ---
  const handleDeliveryAction = async (id, action) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/orders/${id}/delivery-action`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userInfo.token}`,
          },
          body: JSON.stringify({ action }),
        }
      );

      if (res.ok) {
        toast.success(
          `Mission ${action === "accept" ? "Locked In" : "Declined"}`
        );
        fetchMyDeliveries();
      } else {
        const error = await res.json();
        toast.error(error.message || "Action Failed");
      }
    } catch (error) {
      toast.error("Transmission Error");
    }
  };

  const markAsDelivered = async (id) => {
    const otp = otpInputs[id];
    if (!otp || otp.toString().length !== 4)
      return toast.error("Enter 4-digit Secure OTP");

    try {
      const res = await fetch(`${BASE_URL}/api/v1/orders/${id}/deliver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({ otp: Number(otp) }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Target Reached: Order Delivered! 🏁");
        setOtpInputs((prev) => ({ ...prev, [id]: "" }));
        fetchMyDeliveries();
      } else {
        toast.error(data.message || "OTP Invalid");
      }
    } catch (error) {
      toast.error("Handshake Failed");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">
          Initializing Flight Systems...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-20 px-4 text-white font-sans">
      <div className="max-w-4xl mx-auto">
        {/* --- Header Section --- */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative p-5 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/20 rotate-3 transition-transform hover:rotate-0">
                <Truck size={36} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                Pilot <span className="text-blue-500">Ops</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-black tracking-[0.4em] uppercase mt-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>{" "}
                Active Duty: {userInfo?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 px-6 py-3 rounded-2xl">
            <Signal size={14} className="text-green-500 animate-pulse" />
            <span className="text-[11px] font-black text-white uppercase tracking-widest">
              System Online
            </span>
          </div>
        </header>

        {/* --- Tab Navigation --- */}
        <div className="flex bg-black/50 p-1.5 rounded-3xl mb-12 border border-gray-900 shadow-inner">
          {[
            { id: "tasks", label: "Missions", icon: ListChecks, color: "blue" },
            {
              id: "earnings",
              label: "Payday",
              icon: DollarSign,
              color: "green",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${
                activeTab === tab.id
                  ? `bg-${tab.color}-600 text-white shadow-2xl shadow-${tab.color}-600/30 scale-105`
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* --- Content Switcher --- */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {activeTab === "tasks" ? (
            <div className="space-y-10">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  Current <span className="text-blue-500">Radar</span>
                </h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-800 to-transparent"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {tasks.filter((t) => !t.isDelivered).length} Pending
                </span>
              </div>

              {tasks.filter((t) => !t.isDelivered).length === 0 ? (
                <div className="text-center py-32 bg-gray-900/20 rounded-[3.5rem] border-2 border-dashed border-gray-900">
                  <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Package size={40} className="text-gray-700" />
                  </div>
                  <p className="text-gray-600 font-black uppercase text-[10px] tracking-[0.4em] italic">
                    Radar Clear: Standing by for orders...
                  </p>
                </div>
              ) : (
                <div className="grid gap-8">
                  {tasks
                    .filter((t) => !t.isDelivered)
                    .map((task) => (
                      <DeliveryCard
                        key={task._id}
                        order={task}
                        onAction={handleDeliveryAction}
                        onVerify={markAsDelivered}
                        otpValue={otpInputs[task._id] || ""}
                        setOtpValue={(val) =>
                          setOtpInputs({ ...otpInputs, [task._id]: val })
                        }
                      />
                    ))}
                </div>
              )}
            </div>
          ) : (
            <EarningsHistory tasks={tasks} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerDashboard;
