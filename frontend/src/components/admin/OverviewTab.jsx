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
 Users as UsersIcon,
} from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const OverviewTab = () => {
 const { userInfo } = useSelector((state) => state.user);
 const [graphData, setGraphData] = useState([]);
 const [stats, setStats] = useState({ revenue: 0, orders: 0, restaurants: 0, users: 0 });
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
 const results = await Promise.allSettled([
 fetch(`${BASEURL}/api/v1/orders/sales-stats`, config),
 fetch(`${BASEURL}/api/v1/orders/analytics`, config),
 fetch(`${BASEURL}/api/v1/analytics/admin/summary`, config),
 fetch(`${BASEURL}/api/v1/analytics/admin/top-restaurants?limit=5`, config),
 fetch(`${BASEURL}/api/v1/analytics/admin/top-products?limit=5`, config),
 ]);

 // Handle graph independently
 if (results[0].status === "fulfilled" && results[0].value.ok) {
 const graphResult = await results[0].value.json();
 const safeGraph = Array.isArray(graphResult) ? graphResult : [];
 const formatted = safeGraph.map((item) => ({
 day: new Date(item._id).toLocaleDateString("en-IN", {
 weekday: "short",
 }),
 sales: item.sales || 0,
 }));
 setGraphData(formatted);
 } else {
 console.warn("Sales graph API failed:", results[0].status === "fulfilled" ? results[0].value.status : results[0].reason?.message);
 setGraphData([]);
 }

 // Handle stats independently
 if (results[1].status === "fulfilled" && results[1].value.ok) {
 const statsResult = await results[1].value.json();
 setStats({
 revenue: statsResult.totalSales || 0,
 orders: statsResult.totalOrders || 0,
 restaurants: statsResult.totalRestaurants || 0,
 users: statsResult.totalUsers || 0,
 });
 } else {
 console.warn("Dashboard stats API failed:", results[1].status === "fulfilled" ? results[1].value.status : results[1].reason?.message);
 }

 // FEAT-24: New admin analytics endpoints
 if (results[2].status === "fulfilled" && results[2].value.ok) {
 const adminData = await results[2].value.json();
 setAdminStats(adminData);
 } else {
 console.warn("Admin summary API failed:", results[2].status === "fulfilled" ? results[2].value.status : results[2].reason?.message);
 }

 if (results[3].status === "fulfilled" && results[3].value.ok) {
 const topRestData = await results[3].value.json();
 setTopRestaurants(topRestData.top || []);
 } else {
 console.warn("Top restaurants API failed:", results[3].status === "fulfilled" ? results[3].value.status : results[3].reason?.message);
 }

 if (results[4].status === "fulfilled" && results[4].value.ok) {
 const topProdData = await results[4].value.json();
 setTopProducts(topProdData.top || []);
 } else {
 console.warn("Top products API failed:", results[4].status === "fulfilled" ? results[4].value.status : results[4].reason?.message);
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
 <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
 {/* 🚀 1. Stats Cards Section */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
 {/* Revenue Card */}
 <div className="group bg-gray-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 flex items-center gap-4 sm:gap-6 shadow-2xl transition-all hover:border-green-500/30">
 <div className="p-3 sm:p-5 bg-green-500/10 rounded-2xl text-green-500 group-hover:scale-110 transition-transform shrink-0">
 <IndianRupee size={28} />
 </div>
 <div className="min-w-0">
 <p className="text-gray-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">
 Total Revenue
 </p>
 <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate">
 ₹{stats.revenue.toLocaleString("en-IN")}
 </h3>
 </div>
 </div>

 {/* Orders Card */}
 <div className="group bg-gray-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 flex items-center gap-4 sm:gap-6 shadow-2xl transition-all hover:border-blue-500/30">
 <div className="p-3 sm:p-5 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform shrink-0">
 <ShoppingBag size={28} />
 </div>
 <div className="min-w-0">
 <p className="text-gray-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">
 Total Orders
 </p>
 <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate">
 {stats.orders.toLocaleString()}
 </h3>
 </div>
 </div>

 {/* Restaurants Card */}
 <div className="group bg-gray-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 flex items-center gap-4 sm:gap-6 shadow-2xl transition-all hover:border-orange-500/30">
 <div className="p-3 sm:p-5 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform shrink-0">
 <Store size={28} />
 </div>
 <div className="min-w-0">
 <p className="text-gray-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">
 Active Kitchens
 </p>
 <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate">
 {stats.restaurants}
 </h3>
 </div>
 </div>

 {/* Users Card (FEAT-24) */}
 <div className="group bg-gray-900 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-gray-800 flex items-center gap-4 sm:gap-6 shadow-2xl transition-all hover:border-purple-500/30">
 <div className="p-3 sm:p-5 bg-purple-500/10 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform shrink-0">
 <UsersIcon size={28} />
 </div>
 <div className="min-w-0">
 <p className="text-gray-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">
 Total Users
 </p>
 <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate">
 {adminStats?.users?.total?.toLocaleString() || stats.users || 0}
 </h3>
 {adminStats?.users?.newThisMonth > 0 && (
 <p className="text-[9px] sm:text-[10px] text-green-400 font-bold mt-1">
 +{adminStats.users.newThisMonth} this month
 </p>
 )}
 </div>
 </div>
 </div>

 {/* 📈 FEAT-24: Top Restaurants & Products Grid */}
 {adminStats && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
 {/* Top Restaurants */}
 <div className="bg-gray-950 border border-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-2xl">
 <h4 className="text-base sm:text-lg font-black uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
 <Store size={18} className="text-primary shrink-0" />
 <span>Top Restaurants <span className="text-primary">(30d)</span></span>
 </h4>
 <div className="space-y-2.5 sm:space-y-3">
 {topRestaurants.length === 0 && (
 <p className="text-gray-500 text-sm">No data yet</p>
 )}
 {topRestaurants.map((r, i) => (
 <div key={r._id || i} className="flex items-center justify-between bg-gray-900 p-2.5 sm:p-3 rounded-xl">
 <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
 <span className="text-primary font-black text-sm w-5 sm:w-6 shrink-0">{i + 1}</span>
 <img src={r.image || "/placeholder-food.jpg"} alt={r.name || "Restaurant"} onError={(e) => { e.target.src = "/placeholder-food.jpg"; }} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0" />
 <span className="text-white font-bold text-xs sm:text-sm truncate">{r.name}</span>
 </div>
 <span className="text-green-400 font-bold text-xs shrink-0 ml-2">₹{Math.round(r.revenue).toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Top Products */}
 <div className="bg-gray-950 border border-gray-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-2xl">
 <h4 className="text-base sm:text-lg font-black uppercase tracking-tighter text-white mb-4 flex items-center gap-2">
 <ShoppingBag size={18} className="text-primary shrink-0" />
 <span>Top Products <span className="text-primary">(30d)</span></span>
 </h4>
 <div className="space-y-2.5 sm:space-y-3">
 {topProducts.length === 0 && (
 <p className="text-gray-500 text-sm">No data yet</p>
 )}
 {topProducts.map((p, i) => (
 <div key={p._id || i} className="flex items-center justify-between bg-gray-900 p-2.5 sm:p-3 rounded-xl">
 <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
 <span className="text-primary font-black text-sm w-5 sm:w-6 shrink-0">{i + 1}</span>
 <img src={p.image || "/placeholder-food.jpg"} alt={p.name || "Product"} onError={(e) => { e.target.src = "/placeholder-food.jpg"; }} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0" />
 <span className="text-white font-bold text-xs sm:text-sm truncate">{p.name}</span>
 </div>
 <span className="text-green-400 font-bold text-xs shrink-0 ml-2">{p.qtySold} sold</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* 📈 2. Main Analytics Chart */}
 <div className="bg-gray-950 border border-gray-900 p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-[3.5rem] shadow-2xl relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

 <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-6 md:mb-12">
 <div>
 <h3 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter flex items-center gap-3 flex-wrap">
 <TrendingUp className="text-primary shrink-0" size={24} /> Performance{" "}
 <span className="text-primary">Trends</span>
 </h3>
 <p className="text-[8px] sm:text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em] mt-2">
 Daily sales volume analysis
 </p>
 </div>
 <div className="bg-primary/10 text-primary px-3 sm:px-5 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest animate-pulse self-start shrink-0">
 Live Sync
 </div>
 </div>

 <div className="h-[220px] sm:h-[300px] md:h-[400px] w-full relative">
 {graphData.length === 0 && (
 <div className="absolute inset-0 flex items-center justify-center z-10">
 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]">No sales data yet</p>
 </div>
 )}
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
 <div className="flex items-start sm:items-center gap-3 sm:gap-4 bg-gray-900/50 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
 <AlertCircle size={20} className="text-primary shrink-0 mt-0.5 sm:mt-0" />
 <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
 The analytics engine visualizes successful payments only. Refunded or
 cancelled orders are not calculated in the revenue trend. Data
 refreshes every time the tab is active.
 </p>
 </div>
 </div>
 );
};

export default OverviewTab;
