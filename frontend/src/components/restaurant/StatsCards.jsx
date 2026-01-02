import React from "react";
import { Clock, TrendingUp, ClipboardList } from "lucide-react";

const StatsCards = ({ stats }) => {
  const cards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-400",
    },
    {
      label: "Revenue",
      value: `₹${stats.revenue}`,
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      label: "Completed",
      value: stats.delivered,
      icon: ClipboardList,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between"
        >
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              {card.label}
            </p>
            <h3 className="text-3xl font-bold">{card.value}</h3>
          </div>
          <card.icon className={card.color} />
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
