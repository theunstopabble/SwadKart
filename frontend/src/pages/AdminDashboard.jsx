import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";

import {
 LayoutDashboard,
 ShoppingBag,
 Store,
 UtensilsCrossed,
 Tag,
 Users as UsersIcon,
 Flame,
 Loader,
} from "lucide-react";
import { BASEURL } from "../config";

// 👇 IMPORT CHILD COMPONENTS
import OverviewTab from "../components/admin/OverviewTab";
import OrdersTab from "../components/admin/OrdersTab";
import ShopsTab from "../components/admin/ShopsTab";
import MenuTab from "../components/admin/MenuTab";
import CouponsTab from "../components/admin/CouponsTab";
import UsersTab from "../components/admin/UsersTab";
import HeatmapTab from "../components/admin/HeatmapTab";

const AdminDashboard = () => {
 const { userInfo } = useSelector((state) => state.user);
 const [activeTab, setActiveTab] = useState("overview");

 // --- CENTRALIZED DATA STATES ---
 const [pageLoading, setPageLoading] = useState(true);
 const [orders, setOrders] = useState([]);
 const [restaurants, setRestaurants] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);

  // --- FETCH ALL DATA ---
  // ADMIN-02 FIX: Per-section error isolation + reduced order limit to prevent Render timeout
  const fetchAllData = useCallback(async () => {
  if (!userInfo) return;
  const fetchOptions = { credentials: "include" };

  const results = await Promise.allSettled([
  fetch(`${BASEURL}/api/v1/restaurants/admin/all`, fetchOptions),
  fetch(`${BASEURL}/api/v1/orders?limit=50&page=1`, fetchOptions),
  fetch(`${BASEURL}/api/v1/users/delivery-partners`, fetchOptions),
  ]);

 // 1. Restaurants
 if (results[0].status === "fulfilled") {
 const res = results[0].value;
 if (res.ok) {
 const data = await res.json();
 setRestaurants(Array.isArray(data) ? data : data.data || []);
 } else {
 console.warn("Restaurants fetch failed:", res.status);
 }
 } else {
 console.error("Restaurants fetch error:", results[0].reason?.message);
 }

 // 2. Orders
 if (results[1].status === "fulfilled") {
 const res = results[1].value;
 if (res.ok) {
 const data = await res.json();
 setOrders(Array.isArray(data) ? data : data.data || []);
 } else {
 console.warn("Orders fetch failed:", res.status);
 }
 } else {
 console.error("Orders fetch error:", results[1].reason?.message);
 }

 // 3. Delivery Partners
 if (results[2].status === "fulfilled") {
 const res = results[2].value;
 if (res.ok) {
 const data = await res.json();
 setDeliveryPartners(Array.isArray(data) ? data : data.data || []);
 } else {
 console.warn("Partners fetch failed:", res.status);
 }
 } else {
 console.error("Partners fetch error:", results[2].reason?.message);
 }

  }, [userInfo]);

 useEffect(() => {
 const loadDashboardData = async () => {
 if (userInfo?.role === "admin") {
 await fetchAllData();
 }
 setPageLoading(false);
 };

 loadDashboardData();
 }, [userInfo, fetchAllData]);

 if (pageLoading) {
 return (
 <div className="min-h-screen bg-black text-white flex items-center justify-center">
 <Loader className="animate-spin text-primary" size={40} />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-black text-white pt-20 pb-10 px-4 md:px-10 font-sans">
 <div className="max-w-7xl mx-auto">
 <header className="mb-6 md:mb-10">
 <div className="flex items-center gap-3 sm:gap-4">
 <span className="bg-primary text-white p-2.5 sm:p-3 rounded-2xl shadow-lg shadow-primary/25 rotate-3 shrink-0 text-lg sm:text-xl leading-none">
 👑
 </span>
 <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tighter leading-tight">
 Admin <span className="text-primary">Control</span> Center
 </h1>
 </div>
 <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em] sm:tracking-[0.5em] mt-2 md:mt-3 pl-2">
 Platform wide intelligence & oversight
 </p>
 </header>

  {/* --- TABS NAVIGATION --- */}
  {/* MOBILE: grid box layout (md:hidden) */}
  <div className="md:hidden bg-gray-900/60 rounded-2xl p-3 mb-6">
    <div className="grid grid-cols-2 gap-2">
      {[
        { id: "overview", label: "Analytics", icon: LayoutDashboard },
        { id: "heatmap", label: "Heatmap", icon: Flame },
        { id: "orders", label: "Orders", icon: ShoppingBag },
        { id: "users", label: "Users", icon: UsersIcon },
        { id: "shops", label: "Shops", icon: Store },
        { id: "menu", label: "Menu Lab", icon: UtensilsCrossed },
        { id: "coupons", label: "Marketing", icon: Tag },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-3 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all last:col-span-2 ${
            activeTab === tab.id
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-black/40 text-gray-500 hover:text-white hover:bg-gray-800"
          }`}
        >
          <tab.icon size={14} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  </div>

  {/* DESKTOP: horizontal bar (hidden on mobile) */}
  <div className="hidden md:flex overflow-x-auto gap-2 sm:gap-3 mb-6 md:mb-10 pb-4 pl-2 no-scrollbar border-b border-gray-800">
    {[
      { id: "overview", label: "Analytics", icon: LayoutDashboard },
      { id: "heatmap", label: "Heatmap", icon: Flame },
      { id: "orders", label: "Orders", icon: ShoppingBag },
      { id: "users", label: "Users", icon: UsersIcon },
      { id: "shops", label: "Shops", icon: Store },
      { id: "menu", label: "Menu Lab", icon: UtensilsCrossed },
      { id: "coupons", label: "Marketing", icon: Tag },
    ].map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border shrink-0 ${
          activeTab === tab.id
            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
            : "bg-gray-900 border-gray-800 text-gray-500 hover:text-white hover:border-gray-700"
        }`}
      >
        <tab.icon size={14} className="sm:hidden" />
        <tab.icon size={16} className="hidden sm:block" />
        <span className="truncate">{tab.label}</span>
      </button>
    ))}
  </div>

 {/* --- RENDER ACTIVE TAB --- */}
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
 {activeTab === "overview" && <OverviewTab />}
 {activeTab === "heatmap" && <HeatmapTab />}

 {activeTab === "orders" && (
 <OrdersTab
 orders={orders}
 deliveryPartners={deliveryPartners}
 userInfo={userInfo}
 fetchAllData={fetchAllData}
 />
 )}

 {activeTab === "users" && (
 <UsersTab userInfo={userInfo} fetchAllData={fetchAllData} />
 )}

 {activeTab === "shops" && (
 <ShopsTab
 restaurants={restaurants}
 userInfo={userInfo}
 fetchAllData={fetchAllData}
 />
 )}

 {activeTab === "menu" && (
 <MenuTab restaurants={restaurants} userInfo={userInfo} />
 )}

 {activeTab === "coupons" && (
 <CouponsTab
 userInfo={userInfo}
 fetchAllData={fetchAllData}
 />
 )}
 </div>
 </div>
 </div>
 </div>
 );
};

export default AdminDashboard;
