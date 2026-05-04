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
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const OverviewTab = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [graphData, setGraphData] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, restaurants: 0 });
  const [adminStats, setAdminStats] = useState(null);
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAdminStats = async () => {
      try {
        const config = {
          credentials: "include",
        };

        // ADMIN-07 FIX: Handle graph and stats API failures independently + fix field name mismatch
        const [resGraph, resStats, resAdmin, resTopRest, resTopProd] = await Promise.all([
          fetch(`${BASEURL}/api/v1/orders/sales-stats`, config),
          fetch(`${BASEURL}/api/v1/orders/analytics`, config),
          fetch(`${BASEURL}/api/v1/analytics/admin/summary`, config),
          fetch(`${BASEURL}/api/v1/analytics/admin/top-restaurants?limit=5`, config),
          fetch(`${BASEURL}/api/v1/analytics/admin/top-products?limit=5`, config),
        ]);

        // Handle graph independently
        if (resGraph.ok) {
          const graphResult = await resGraph.json();
          const safeGraph = Array.isArray(graphResult) ? graphResult : [];
          const formatted = safeGraph.map((item) => ({
            day: new Date(item._id).toLocaleDateString("en-IN", {
              weekday: "short",
            }),
            sales: item.sales || 0,
          }));
          setGraphData(formatted);
        } else {
          console.warn("Sales graph API failed:", resGraph.status);
          setGraphData([]);
        }

        // Handle stats independently
        if (resStats.ok) {
          const statsResult = await resStats.json();
          setStats({
            revenue: statsResult.totalSales || 0, // ADMIN-07 FIX: was stats.revenue, backend sends totalSales
            orders: statsResult.totalOrders || 0,
            restaurants: statsResult.totalRestaurants || 0,
            users: statsResult.totalUsers || 0,
          });
        } else {
          console.warn("Dashboard stats API failed:", resStats.status);
        }

        // FEAT-24: New admin analytics endpoints
        if (resAdmin.ok) {
          const adminData = await resAdmin.json();
          setAdminStats(adminData);
        } else {
          console.warn("Admin summary API failed:", resAdmin.status);
        }

        if (resTopRest.ok) {
          const topRestData = await resTopRest.json();
          setTopRestaurants(topRestData.top || []);
        }

        if (resTopProd.ok) {
          const topProdData = await resTopProd.json();
          setTopProducts(topProdData.top || []);
        }
      } catch {
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

        {/* Users Card (FEAT-24) */}
        <div className="group bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex items-center gap-6 shadow-2xl transition-all hover:border-purple-500/30">
          <div className="p-5 bg-purple-500/10 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
            <UsersIcon size={32} />
          </div>
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Total Users
            </p>
            <h3 className="text-3xl font-black italic text-white tracking-tighter">
              {adminStats?.users?.total?.toLocaleString() || stats.users || 0}
            </h3>
            {adminStats?.users?.newThisMonth > 0 && (
              <p className="text-[10px] text-green-400 font-bold mt-1">
                +{adminStats.users.newThisMonth} this month
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 📈 FEAT-24: Top Restaurants & Products Grid */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Restaurants */}
          <div className="bg-gray-950 border border-gray-900 p-6 rounded-[2.5rem] shadow-2xl">
            <h4 className="text-lg font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
              <Store size={18} className="text-primary" />
              Top Restaurants <span className="text-primary">(30d)</span>
            </h4>
            <div className="space-y-3">
              {topRestaurants.length === 0 && (
                <p className="text-gray-500 text-sm">No data yet</p>
              )}
              {topRestaurants.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-black text-sm w-6">{i + 1}</span>
                    <img src={r.image || "https://placehold.co/40"} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-white font-bold text-sm">{r.name}</span>
                  </div>
                  <span className="text-green-400 font-bold text-xs">₹{Math.round(r.revenue).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-gray-950 border border-gray-900 p-6 rounded-[2.5rem] shadow-2xl">
            <h4 className="text-lg font-black italic uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary" />
              Top Products <span className="text-primary">(30d)</span>
            </h4>
            <div className="space-y-3">
              {topProducts.length === 0 && (
                <p className="text-gray-500 text-sm">No data yet</p>
              )}
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-black text-sm w-6">{i + 1}</span>
                    <img src={p.image || "https://placehold.co/40"} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-white font-bold text-sm">{p.name}</span>
                  </div>
                  <span className="text-green-400 font-bold text-xs">{p.qtySold} sold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
