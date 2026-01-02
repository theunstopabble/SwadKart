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
import { TrendingUp, IndianRupee } from "lucide-react";
import { BASE_URL } from "../../config";

const RestaurantAnalytics = ({ token }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/v1/orders/restaurant-sales-stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const result = await res.json();
        const formatted = result.map((item) => ({
          day: new Date(item._id).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          revenue: item.sales,
        }));
        setData(formatted);
      } catch (e) {
        console.log(e);
      }
    };
    fetchStats();
  }, [token]);

  return (
    <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl mt-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
          <TrendingUp className="text-primary" /> Your Sales{" "}
          <span className="text-primary">Growth</span>
        </h3>
        <div className="bg-green-500/10 text-green-500 px-4 py-1 rounded-full text-[10px] font-black uppercase">
          Weekly Stats
        </div>
      </div>

      <div className="h-[300px] w-full">
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
                borderRadius: "15px",
                border: "1px solid #374151",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#restroSales)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RestaurantAnalytics;
