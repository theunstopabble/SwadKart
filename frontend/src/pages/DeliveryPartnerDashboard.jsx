import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getSocket } from "../utils/socket";
import {
  Truck,
  Package,
  DollarSign,
  ListChecks,
  Loader2,
  Signal,
  Calculator,
} from "lucide-react";
import { BASEURL } from "../config";

// Modular Components
import DeliveryCard from "../components/delivery/DeliveryCard";
import EarningsHistory from "../components/delivery/EarningsHistory";
import SOSButton from "../components/delivery/SOSButton";
import OTPSection from "../components/delivery/OTPSection";
import DriverEarningsCalculator from "../components/delivery/DriverEarningsCalculator";

const DeliveryPartnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

  // --- States ---
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});

  // --- Fetch Logic ---
  const fetchMyDeliveries = useCallback(async () => {
    if (!userInfo) return;
    try {
      const res = await fetch(`${BASEURL}/api/v1/orders/my-deliveries`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const safeData = Array.isArray(data) ? data : data.data || [];
        const sortedTasks = safeData.sort((a, b) => {
          // DPD-01 FIX: Active deliveries first, newest-first within each group
          if (a.isDelivered !== b.isDelivered) return a.isDelivered ? 1 : -1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setTasks(sortedTasks);
      }
    } catch {
      toast.error("Radar Sync Failed: Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  const fetchRef = useRef(fetchMyDeliveries);

  useEffect(() => {
    fetchRef.current = fetchMyDeliveries;
  }, [fetchMyDeliveries]);

  useEffect(() => {
    if (!userInfo) {
      navigate("/login");
      return;
    }

    fetchRef.current();

    const socket = getSocket();

    const handleOrderAssigned = () => {
      toast.success("🚀 NEW MISSION ASSIGNED!", {
        duration: 5000,
        icon: "🛵",
        style: {
          borderRadius: "15px",
          background: "#0f172a",
          color: "#fff",
          border: "1px solid #ff6b6b",
        },
      });
      fetchRef.current();
    };
    socket.on("orderAssigned", handleOrderAssigned);

    return () => {
      socket.off("orderAssigned", handleOrderAssigned);
      // Intentionally not calling disconnectSocket here since it's a shared singleton
    };
  }, [userInfo, navigate]);

  // --- Handlers ---
  const handleDeliveryAction = async (id, action) => {
    try {
      const res = await fetch(
        `${BASEURL}/api/v1/orders/${id}/delivery-action`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ action }),
        },
      );

      if (res.ok) {
        await res.json().catch(() => ({}));
        toast.success(
          `Mission ${action === "accept" ? "Locked In" : "Declined"}`,
        );
        fetchMyDeliveries();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Action Failed");
      }
    } catch {
      toast.error("Transmission Error");
    }
  };

  const markAsDelivered = async (id) => {
    const otp = otpInputs[id];
    if (!otp || String(otp || "").length !== 4)
      return toast.error("Enter valid 4-digit OTP");

    try {
      const res = await fetch(`${BASEURL}/api/v1/orders/${id}/deliver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ otp: Number(otp) }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data?.message || "Target Reached: Order Delivered!");
        setOtpInputs((prev) => ({ ...prev, [id]: "" }));
        fetchMyDeliveries();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "OTP Invalid");
      }
    } catch {
      toast.error("Handshake Failed");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-gray-500 font-extrabold uppercase text-[10px] tracking-[0.5em] animate-pulse">
          Initializing Flight Systems...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-black pt-20 pb-24 sm:pb-20 px-3 sm:px-4 text-white font-sans">
      <div className="max-w-4xl mx-auto">
        {/* --- Header Section --- */}
        <header className="mb-8 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 px-1 sm:px-2">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative p-3 sm:p-5 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl transition-transform hover:scale-105">
                <Truck size={28} className="text-blue-500" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold uppercase italic tracking-tighter leading-none break-words">
                Pilot <span className="text-blue-500">Ops</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold tracking-[0.3em] sm:tracking-[0.4em] uppercase mt-2 sm:mt-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                <span className="truncate">Active Duty: {userInfo?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-gray-900 border border-gray-800 px-3 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg self-start md:self-auto">
            <Signal size={12} className="sm:size-[14] text-green-500 animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[11px] font-extrabold text-white uppercase tracking-widest whitespace-nowrap">
              System Online
            </span>
          </div>
        </header>

        {/* --- Tab Navigation --- */}
        <div className="flex bg-gray-900/50 p-1 rounded-xl sm:rounded-2xl mb-8 sm:mb-12 border border-gray-800 shadow-inner">
          {[
            {
              id: "tasks",
              label: "Missions",
              icon: ListChecks,
              activeBg: "bg-blue-600",
            },
            {
              id: "earnings",
              label: "Earnings",
              icon: DollarSign,
              activeBg: "bg-green-600",
            },
            {
              id: "calculator",
              label: "Calculator",
              icon: Calculator,
              activeBg: "bg-yellow-600",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-3 py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-extrabold text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all duration-300 ${
                activeTab === tab.id
                  ? `${tab.activeBg} text-white shadow-lg scale-[1.02]`
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              <tab.icon size={14} className="sm:size-[18] shrink-0" />
              <span className="sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* --- Content Switcher --- */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {activeTab === "tasks" ? (
            <div className="space-y-6 sm:space-y-10">
              <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2">
                <h3 className="text-lg sm:text-2xl font-extrabold uppercase italic tracking-tighter text-white">
                  Current <span className="text-blue-500">Radar</span>
                </h3>
                <div className="h-[1px] flex-1 bg-gray-800"></div>
                <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900 px-2 sm:px-3 py-1 rounded-lg border border-gray-800 whitespace-nowrap">
                  {tasks.filter((t) => !t.isDelivered).length} Pending
                </span>
              </div>

              {tasks.filter((t) => !t.isDelivered).length === 0 ? (
                <div className="text-center py-16 sm:py-32 bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-800 mx-1 sm:mx-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl">
                    <Package size={24} className="sm:size-[32] text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-extrabold uppercase text-[9px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.4em] italic px-4">
                    Radar Clear: Standing by for orders...
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-8">
                  {tasks
                    .filter((t) => !t.isDelivered)
                    .map((task) => (
                      <div
                        key={task._id}
                        className="bg-gray-900 border border-gray-800 rounded-2xl p-1 shadow-2xl hover:border-blue-500/30 transition-all"
                      >
                        <DeliveryCard
                          order={task}
                          onAction={handleDeliveryAction}
                        />
                        {task.orderStatus === "Out for Delivery" && (
                          <div className="px-3 pb-3">
                            <OTPSection
                              orderId={task._id}
                              otpValue={otpInputs[task._id] || ""}
                              onOtpChange={(val) =>
                                setOtpInputs({
                                  ...otpInputs,
                                  [task._id]: val,
                                })
                              }
                              onVerify={() => markAsDelivered(task._id)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : activeTab === "earnings" ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
              <EarningsHistory tasks={tasks} />
            </div>
          ) : (
            <DriverEarningsCalculator />
          )}
        </div>

        {/* 🔴 SOS — outside container so fixed position works cleanly */}
      </div>
      <SOSButton />
    </div>
  );
};

export default DeliveryPartnerDashboard;
