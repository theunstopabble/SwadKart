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
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // --- FETCH ALL DATA ---
  // ADMIN-02 FIX: Per-section error isolation + reduced order limit to prevent Render timeout
  const fetchAllData = useCallback(async () => {
    if (!userInfo) return;
    const fetchOptions = { credentials: "include" };

    // 1. Restaurants — isolated
    try {
      const resRest = await fetch(
        `${BASEURL}/api/v1/restaurants/admin/all`,
        fetchOptions,
      );
      if (resRest.ok) {
        const restResponse = await resRest.json();
        setRestaurants(
          Array.isArray(restResponse) ? restResponse : restResponse.data || [],
        );
      } else {
        console.warn("Restaurants fetch failed:", resRest.status);
      }
    } catch (err) {
      console.error("Restaurants fetch error:", err.message);
    }

    // 2. Orders — isolated, reduced limit to 50
    try {
      const resOrders = await fetch(
        `${BASEURL}/api/v1/orders?limit=50&page=1`,
        fetchOptions,
      );
      if (resOrders.ok) {
        const ordersResponse = await resOrders.json();
        setOrders(ordersResponse.data || ordersResponse);
      } else {
        console.warn("Orders fetch failed:", resOrders.status);
      }
    } catch (err) {
      console.error("Orders fetch error:", err.message);
    }

    // 3. Delivery Partners — isolated
    try {
      const resPartners = await fetch(
        `${BASEURL}/api/v1/users/delivery-partners`,
        fetchOptions,
      );
      if (resPartners.ok) {
        setDeliveryPartners(await resPartners.json());
      } else {
        console.warn("Partners fetch failed:", resPartners.status);
      }
    } catch (err) {
      console.error("Partners fetch error:", err.message);
    }

    // 4. Coupons — isolated (was using axios which could throw on non-2xx)
    try {
      const resCoupons = await fetch(`${BASEURL}/api/v1/coupons`, fetchOptions);
      if (resCoupons.ok) {
        setCoupons(await resCoupons.json());
      } else {
        console.warn("Coupons fetch failed:", resCoupons.status);
      }
    } catch (err) {
      console.error("Coupons fetch error:", err.message);
    }
  }, [userInfo]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (userInfo?.role === "admin") {
        await fetchAllData();
      }
    };

    loadDashboardData();
  }, [userInfo, fetchAllData]);

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-10 px-4 md:px-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter flex items-center gap-4">
            <span className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/25 rotate-2">
              👑
            </span>
            Admin <span className="text-primary">Control</span> Center
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.5em] mt-3 pl-2">
            Platform wide intelligence & oversight
          </p>
        </header>

        {/* --- TABS NAVIGATION --- */}
        <div className="flex overflow-x-auto gap-3 mb-10 pb-4 no-scrollbar border-b border-gray-800">
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
              className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "bg-gray-900 border-gray-800 text-gray-500 hover:text-white hover:border-gray-700"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* --- RENDER ACTIVE TAB --- */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            {activeTab === "overview" && <OverviewTab userInfo={userInfo} />}
            {activeTab === "heatmap" && <HeatmapTab userInfo={userInfo} />}

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
                coupons={coupons}
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
