import React from "react";
import { Clock, TrendingUp, ClipboardList } from "lucide-react";

const StatsCards = ({ stats }) => {
  // 🛡️ Safety: Ensure stats object exists
  const data = stats || {};

  const cards = [
    {
      label: "Pending Orders",
      value: data.pending || 0,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
      border: "border-yellow-400/20",
    },
    {
      label: "Total Revenue",
      value: `₹${(data.revenue || 0).toLocaleString("en-IN")}`, // Formats 1000 to 1,000
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
    },
    {
      label: "Completed Orders",
      value: data.delivered || 0,
      icon: ClipboardList,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 flex justify-between items-center shadow-lg hover:border-gray-700 transition-all hover:-translate-y-1"
        >
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              {card.label}
            </p>
            <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">
              {card.value}
            </h3>
          </div>

          <div
            className={`p-4 rounded-2xl ${card.bg} ${card.border} border ${card.color} shadow-inner`}
          >
            <card.icon size={28} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
