import React from "react";
import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatsCards from "./StatsCards";

const AnalyticsSection = ({ stats, graphData }) => {
  // 🛡️ CRASH PROTECTION: Ensure graphData is an array
  const safeGraphData = Array.isArray(graphData) ? graphData : [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Stats Cards Component */}
      <StatsCards stats={stats} />

      {/* Revenue Graph Section */}
      <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[3rem] shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
            <TrendingUp className="text-primary" /> Kitchen{" "}
            <span className="text-primary">Revenue</span>
          </h3>
          <span className="text-[10px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
            Weekly Growth
          </span>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeGraphData}>
              <defs>
                <linearGradient id="restroColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#4b5563"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#000",
                  border: "1px solid #374151",
                  borderRadius: "15px",
                  color: "#fff",
                }}
                itemStyle={{ color: "#ef4444" }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#ef4444"
                strokeWidth={4}
                fill="url(#restroColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;
