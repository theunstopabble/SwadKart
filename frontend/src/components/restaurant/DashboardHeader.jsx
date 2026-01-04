import React, { useState } from "react";
import { ChefHat, Bell, BellOff, Clock, Save, Settings } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { BASE_URL } from "../../config";

const DashboardHeader = ({
  isSoundEnabled,
  setIsSoundEnabled,
  activeTab,
  setActiveTab,
}) => {
  const { userInfo } = useSelector((state) => state.user);
  const [showSettings, setShowSettings] = useState(false);

  // Default timings (You can fetch these from backend on load if needed)
  const [timings, setTimings] = useState({ open: "10:00", close: "22:00" });

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/restaurants/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo?.token}`,
        },
        body: JSON.stringify({
          openingTime: timings.open,
          closingTime: timings.close,
        }),
      });

      if (res.ok) {
        toast.success("Store Timings Updated! ⏰");
        setShowSettings(false);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update settings");
      }
    } catch (e) {
      console.error("Settings Error:", e);
      toast.error("Network Error: Could not save settings");
    }
  };

  return (
    <div className="mb-10">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo & Title */}
        <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <ChefHat className="text-primary h-12 w-12" /> SwadKart{" "}
          <span className="text-primary">Kitchen</span>
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* ⚙️ Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl border transition-all ${
              showSettings
                ? "bg-primary text-white border-primary"
                : "bg-gray-900 border-gray-800 text-gray-500 hover:text-white"
            }`}
            title="Restaurant Settings"
          >
            <Settings
              size={22}
              className={`transition-transform duration-500 ${
                showSettings ? "rotate-90" : ""
              }`}
            />
          </button>

          {/* 🔔 Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-3 rounded-2xl border transition-all ${
              isSoundEnabled
                ? "bg-primary/10 border-primary text-primary"
                : "bg-gray-900 border-gray-800 text-gray-500 hover:text-white"
            }`}
            title={isSoundEnabled ? "Mute Alerts" : "Enable Alerts"}
          >
            {isSoundEnabled ? (
              <Bell size={22} className="animate-pulse" />
            ) : (
              <BellOff size={22} />
            )}
          </button>

          {/* 📊 Tab Switcher (Analytics / Menu) */}
          <div className="flex bg-gray-900 rounded-full p-1 border border-gray-800 shadow-2xl">
            {[
              { id: "overview", label: "Analytics" },
              { id: "menu", label: "Menu Lab" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 md:px-10 py-2 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-lg"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ⚙️ EXPANDABLE SETTINGS PANEL */}
      {showSettings && (
        <div className="mt-6 bg-gray-900 p-6 rounded-3xl border border-gray-800 animate-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row items-center gap-6 justify-between shadow-2xl">
          <div className="flex items-center gap-3 text-gray-400">
            <Clock size={20} className="text-primary" />
            <span className="font-bold text-sm uppercase tracking-widest">
              Store Timings
            </span>
          </div>

          <div className="flex gap-4 items-center">
            {/* Open Time */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-gray-600 mb-1">
                Open
              </label>
              <input
                type="time"
                value={timings.open}
                onChange={(e) =>
                  setTimings({ ...timings, open: e.target.value })
                }
                className="bg-black text-white p-2 rounded-xl border border-gray-700 outline-none focus:border-primary font-bold text-sm"
              />
            </div>

            <span className="text-gray-600 font-black pt-4">-</span>

            {/* Close Time */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-gray-600 mb-1">
                Close
              </label>
              <input
                type="time"
                value={timings.close}
                onChange={(e) =>
                  setTimings({ ...timings, close: e.target.value })
                }
                className="bg-black text-white p-2 rounded-xl border border-gray-700 outline-none focus:border-primary font-bold text-sm"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-lg shadow-green-600/20 transition-all active:scale-95"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
