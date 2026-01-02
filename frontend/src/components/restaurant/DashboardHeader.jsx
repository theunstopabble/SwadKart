import React from "react";
import { ChefHat, Bell, BellOff } from "lucide-react";

const DashboardHeader = ({
  isSoundEnabled,
  setIsSoundEnabled,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
      <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
        <ChefHat className="text-primary h-12 w-12" /> SwadKart{" "}
        <span className="text-primary">Kitchen</span>
      </h1>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          className={`p-3 rounded-2xl border transition-all ${
            isSoundEnabled
              ? "bg-primary/10 border-primary text-primary"
              : "bg-gray-900 border-gray-800 text-gray-500"
          }`}
        >
          {isSoundEnabled ? (
            <Bell size={22} className="animate-pulse" />
          ) : (
            <BellOff size={22} />
          )}
        </button>

        <div className="flex bg-gray-900 rounded-full p-1 border border-gray-800 shadow-2xl">
          {["overview", "menu"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-10 py-2 rounded-full font-black uppercase text-xs tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {tab === "overview" ? "Analytics" : "Menu Lab"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
