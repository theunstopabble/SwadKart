import React from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
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
 const safeGraphData = Array.isArray(graphData) ? graphData : [];

 return (
  <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
  <StatsCards stats={stats} />

  <div className="bg-gray-900/50 border border-gray-800 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-[3rem] shadow-2xl">
  <div className="flex justify-between items-center mb-4 md:mb-8">
 <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
 <TrendingUp className="text-primary" /> Kitchen{" "}
 <span className="text-primary">Revenue</span>
 </h3>
 <span className="text-[10px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
 Weekly Growth
 </span>
 </div>

 {safeGraphData.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-10 md:py-16 text-gray-500">
 <BarChart3 size={48} className="mb-4 opacity-30" />
 <p className="text-sm font-bold uppercase tracking-wider">No revenue data yet</p>
 <p className="text-xs mt-2">Orders will appear here once placed</p>
 </div>
 ) : (
  <div className="h-[200px] md:h-[300px] w-full">
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
 )}
 </div>
 </div>
 );
};

export default AnalyticsSection;
