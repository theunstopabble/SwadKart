import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  Store,
  IndianRupee,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { BASE_URL } from "../../config";
import { toast } from "react-hot-toast";

const OverviewTab = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [graphData, setGraphData] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, restaurants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAdminStats = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        };

        // 1. Fetch Graph Data & Analytics in Parallel for Speed
        const [resGraph, resStats] = await Promise.all([
          fetch(`${BASE_URL}/api/v1/orders/sales-stats`, config),
          fetch(`${BASE_URL}/api/v1/orders/analytics`, config),
        ]);

        const graphResult = await resGraph.json();
        const statsResult = await resStats.json();

        if (resGraph.ok && resStats.ok) {
          // Format Graph with dynamic sorting if needed
          const formatted = graphResult.map((item) => ({
            day: new Date(item._id).toLocaleDateString("en-IN", {
              weekday: "short",
            }),
            sales: item.sales,
          }));
          setGraphData(formatted);

          // Set Dashboard Totals
          setStats({
            revenue: statsResult.totalSales || 0,
            orders: statsResult.totalOrders || 0,
            restaurants: statsResult.totalRestaurants || 0,
          });
        }
      } catch (error) {
        toast.error("Analytics sync failed");
      } finally {
        setLoading(false);
      }
    };

    if (userInfo) fetchAllAdminStats();
  }, [userInfo]);

  if (loading)
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Syncing Admin Radar...
        </p>
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
    
    
      {/* 👆 BAS YE ADD KARNA HAI */}
      {/* 🚀 1. Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Revenue Card */}
        <div className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex items-center gap-6 shadow-2xl transition-all hover:border-green-500/30">
          <div className="p-5 bg-green-500/10 rounded-2xl text-green-500 group-hover:scale-110 transition-transform">
            <IndianRupee size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Total Revenue
            </p>
            <h3 className="text-3xl font-black italic text-white tracking-tighter">
              ₹{stats.revenue.toLocaleString("en-IN")}
            </h3>
          </div>
        </div>

        {/* Orders Card */}
        <div className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex items-center gap-6 shadow-2xl transition-all hover:border-blue-500/30">
          <div className="p-5 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
            <ShoppingBag size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Total Orders
            </p>
            <h3 className="text-3xl font-black italic text-white tracking-tighter">
              {stats.orders.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Restaurants Card */}
        <div className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex items-center gap-6 shadow-2xl transition-all hover:border-orange-500/30">
          <div className="p-5 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform">
            <Store size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Active Kitchens
            </p>
            <h3 className="text-3xl font-black italic text-white tracking-tighter">
              {stats.restaurants}
            </h3>
          </div>
        </div>
      </div>

      {/* 📈 2. Main Analytics Chart */}
      <div className="bg-gray-950 border border-gray-900 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

        <div className="flex justify-between items-start mb-12">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <TrendingUp className="text-primary" size={24} /> Performance{" "}
              <span className="text-primary">Trends</span>
            </h3>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em] mt-2">
              Daily sales volume analysis
            </p>
          </div>
          <div className="bg-primary/10 text-primary px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
            Live Sync
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <defs>
                <linearGradient
                  id="adminChartGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#111827"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#4b5563"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={15}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#000",
                  border: "1px solid #1f2937",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "15px",
                }}
                itemStyle={{ color: "#ef4444" }}
                cursor={{ stroke: "#ef4444", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#ef4444"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#adminChartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 💡 Information Banner */}
      <div className="flex items-center gap-4 bg-gray-900/50 border border-gray-800 p-6 rounded-3xl">
        <AlertCircle size={20} className="text-primary" />
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
          The analytics engine visualizes successful payments only. Refunded or
          cancelled orders are not calculated in the revenue trend. Data
          refreshes every time the tab is active.
        </p>
      </div>
    </div>
  );
};

export default OverviewTab;
