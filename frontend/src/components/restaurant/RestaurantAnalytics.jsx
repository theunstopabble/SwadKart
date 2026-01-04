import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, IndianRupee, Loader2 } from "lucide-react";
import { BASE_URL } from "../../config";

const RestaurantAnalytics = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        setLoading(true);
        // ✅ Correct Backend Route
        const res = await fetch(`${BASE_URL}/api/v1/orders/sales-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch stats");

        const result = await res.json();

        // 🛡️ Safe Mapping (prevents crash if result is not array)
        const safeResult = Array.isArray(result) ? result : [];

        const formatted = safeResult.map((item) => ({
          day: new Date(item._id).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          revenue: item.sales,
        }));

        setData(formatted);
      } catch (e) {
        console.error("Analytics Load Error:", e);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  // 🔄 Loading State
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl mt-8 h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
          <TrendingUp className="text-primary" /> Your Sales{" "}
          <span className="text-primary">Growth</span>
        </h3>
        <div className="bg-green-500/10 text-green-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
          Weekly Stats
        </div>
      </div>

      {/* Chart Container 

[Image of Sales Growth Chart]
 */}
      <div className="h-[300px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <IndianRupee size={48} className="mb-4 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-bold opacity-50">
              No Sales Data Recorded Yet
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="restroSales" x1="0" y1="0" x2="0" y2="1">
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
                tickMargin={10}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val}`} // ✅ Adds Currency Symbol
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderRadius: "12px",
                  border: "1px solid #374151",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                }}
                itemStyle={{ color: "#ef4444" }}
                formatter={(value) => [`₹${value}`, "Revenue"]}
                cursor={{ stroke: "#374151", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ef4444"
                strokeWidth={3}
                fill="url(#restroSales)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RestaurantAnalytics;
