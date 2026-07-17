import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Bell,
  BellOff,
  LayoutDashboard,
  Utensils,
  Calculator,
} from "lucide-react";
import { BASEURL } from "../config";
import { toast } from "react-hot-toast";
import { getSocket } from "../utils/socket";

// Modular Components
import AnalyticsSection from "../components/restaurant/AnalyticsSection";
import LiveOrders from "../components/restaurant/LiveOrders";
import MenuManagement from "../components/restaurant/MenuManagement";
import ItemModal from "../components/restaurant/ItemModal";
import CostCalculator from "../components/restaurant/CostCalculator";
import PricingCalculator from "../components/restaurant/PricingCalculator";
import DeliveryCalculator from "../components/restaurant/DeliveryCalculator";
import RewardCalculator from "../components/restaurant/RewardCalculator";
import AnalyticsForecast from "../components/restaurant/AnalyticsForecast";
import InventoryForecast from "../components/restaurant/InventoryForecast";

const RestaurantOwnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, pending: 0, delivered: 0 });
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Menu Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeCalcTab, setActiveCalcTab] = useState("cost");

  // Partner Selection State
  const [selectedPartner, setSelectedPartner] = useState({});

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true",
    variants: [],
    addons: [],
  });

  const audioPlayer = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (userInfo && userInfo.role !== "restaurant_owner" && userInfo.role !== "admin") {
      toast.error("Access Denied: Restaurant Owners Only");
      navigate("/");
    }
  }, [userInfo, navigate]);

  // ✅ Wrap getFetchOptions in useCallback
  const getFetchOptions = useCallback(
    (method = "GET", body = null, extraHeaders = {}) => ({
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : null,
    }),
    [],
  );

  // ✅ Wrap fetchData in useCallback to prevent infinite render loops
  const fetchData = useCallback(async () => {
    if (!userInfo) return;
    try {
      console.log(
        "Fetching from:",
        `${BASEURL}/api/v1/orders/restaurant-orders`,
      );
      // Helper to safely parse JSON
      const safeJson = async (promise) => {
        try {
          const res = await promise;
          if (!res.ok) return [];
          return res.json();
        } catch (err) {
          console.error("Fetch error:", err);
          return [];
        }
      };

      // ✅ Calling Correct Routes
      const [dOrders, dMenu, dPartners, dGraph] = await Promise.all([
        safeJson(
          fetch(
            `${BASEURL}/api/v1/orders/restaurant-orders`,
            getFetchOptions(),
          ),
        ),
        safeJson(
          fetch(
            `${BASEURL}/api/v1/products/restaurant`,
            getFetchOptions("GET", null, { 'x-restaurant-id': userInfo._id }),
          ),
        ),
        safeJson(
          fetch(`${BASEURL}/api/v1/users/delivery-partners`, getFetchOptions()),
        ),
        safeJson(
          fetch(
            `${BASEURL}/api/v1/orders/sales-stats`,
            getFetchOptions("GET", null, { 'x-restaurant-id': userInfo._id }),
          ),
        ),
      ]);

      // 🛡️ CRASH PROTECTION: Ensure data is strictly an array
      const safeOrders = Array.isArray(dOrders) ? dOrders : [];
      const safeMenu = Array.isArray(dMenu) ? dMenu : [];
      const safePartners = Array.isArray(dPartners) ? dPartners : [];
      const safeGraph = Array.isArray(dGraph) ? dGraph : [];

      setOrders(safeOrders);
      setMenuItems(safeMenu);
      setDeliveryPartners(safePartners);

      setGraphData(
        safeGraph.map((i) => ({
          day: i._id && !isNaN(new Date(i._id).getTime())
            ? new Date(i._id).toLocaleDateString("en-US", { weekday: "short" })
            : "N/A",
          sales: i.sales || 0,
        })),
      );

      setStats({
        revenue: safeOrders.reduce(
          (acc, o) => acc + (o.isPaid ? o.totalPrice : 0),
          0,
        ),
        pending: safeOrders.filter(
          (o) => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled",
        ).length,
        delivered: safeOrders.filter((o) => o.orderStatus === "Delivered")
          .length,
      });
    } catch (e) {
      console.error("Dashboard Sync Error:", e);
      setOrders([]); // Fallback
    } finally {
      setLoading(false);
    }
  }, [userInfo, getFetchOptions]); // ✅ Added dependencies here

  // 🔌 Socket Connection Logic
  useEffect(() => {
    fetchData();
    if (userInfo) {
      const socket = getSocket();
      socketRef.current = socket;

      const handleNewOrder = (newOrder) => {
        if (isSoundEnabled && audioPlayer.current) {
          audioPlayer.current
            .play()
            .catch((e) => console.log("Audio play failed", e));
        }
        toast.success(
          `🔔 NEW ORDER! #${newOrder._id?.slice(-6) || "Unknown"}`,
          {
            duration: 6000,
            icon: "🍕",
            style: {
              borderRadius: "12px",
              background: "#0f172a",
              color: "#fff",
              border: "1px solid #ff6b6b",
            },
          },
        );
        fetchData();
      };
      socket.on("newOrderReceived", handleNewOrder);

      return () => {
        socket.off("newOrderReceived", handleNewOrder);
        // socket.disconnect() removed due to singleton pattern
      };
    }
  }, [userInfo, isSoundEnabled, fetchData]); // ✅ Added fetchData to the dependency array

  const handleToggleStock = async (id) => {
    try {
      const res = await fetch(
        `${BASEURL}/api/v1/products/${id}/toggle-stock`,
        getFetchOptions("PATCH"),
      );
      if (res.ok) {
        // ROD-02 FIX: move toast.success INSIDE the if(res.ok) block and add try-catch
        toast.success("Stock status updated");
        fetchData();
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleAssignPartner = async (orderId) => {
    const pId = selectedPartner[orderId];
    if (!pId) return toast.error("Please select a partner");

    try {
      const res = await fetch(
        `${BASEURL}/api/v1/orders/${orderId}/assign`,
        getFetchOptions("PUT", { deliveryPartnerId: pId }),
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(data?.message || "Pilot Assigned");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Assignment failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await fetch(
        `${BASEURL}/api/v1/orders/${orderId}/status`,
        getFetchOptions("PUT", { status: newStatus }),
      );
      if (res.ok) {
        const data = await res.json();
        toast.success(data?.message || `Order set to ${newStatus}`);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${BASEURL}/api/v1/products/${editId}`
        : `${BASEURL}/api/v1/products`;

      const safePrice = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
      };

      const payload = {
        ...newItem,
        price: safePrice(newItem.price),
        isVeg: newItem.isVeg === "true",
        restaurantId: userInfo._id,
        variants: (newItem.variants || []).map((v) => ({
          ...v,
          price: safePrice(v.price),
        })),
        addons: (newItem.addons || []).map((a) => ({
          ...a,
          price: safePrice(a.price),
        })),
      };

      const res = await fetch(url, getFetchOptions(method, payload));
      if (res.ok) {
        const data = await res.json();
        toast.success(data?.message || "Item added successfully");
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Update failed");
      }
    } catch {
      // ROD-04 FIX: wrap entire fetch in try-catch
      toast.error("Network error saving item");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12 px-4 md:px-8 font-sans">
      <audio ref={audioPlayer} src="/notification.mp3" preload="auto" />

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter flex items-center gap-4">
              <span className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/25 rotate-2">
                🍳
              </span>
              Kitchen <span className="text-primary">Control</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.5em] mt-3 pl-2">
              Manage your orders & culinary lab
            </p>
          </div>

          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 px-6 py-3 rounded-xl shadow-lg">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`flex items-center gap-2 transition-colors ${
                isSoundEnabled ? "text-green-500" : "text-gray-500"
              }`}
            >
              {isSoundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              <span className="text-[11px] font-extrabold uppercase tracking-widest">
                {isSoundEnabled ? "Alerts On" : "Muted"}
              </span>
            </button>
          </div>
        </header>

        {/* --- TABS --- */}
        <div className="flex bg-gray-900/50 p-1.5 rounded-2xl mb-12 border border-gray-800 shadow-inner max-w-md">
          {[
            { id: "overview", label: "Analytics", icon: LayoutDashboard },
            { id: "menu", label: "Menu Lab", icon: Utensils },
            { id: "calculators", label: "Calculators", icon: Calculator },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-extrabold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                activeTab === tab.id
                  ? `bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]`
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
</div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-primary h-12 w-12" />
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-6 animate-pulse">
              Heating up the stoves...
            </p>
          </div>
        ) : activeTab === "calculators" ? (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex bg-gray-900/50 p-1.5 rounded-2xl mb-8 border border-gray-800 shadow-inner max-w-2xl">
              {[
                { id: "cost", label: "Cost" },
                { id: "pricing", label: "Pricing" },
                { id: "delivery", label: "Delivery" },
                { id: "rewards", label: "Rewards" },
                { id: "forecast", label: "Forecast" },
                { id: "inventory", label: "Inventory" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCalcTab(tab.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-[9px] uppercase tracking-wider transition-all duration-300 ${
                    activeCalcTab === tab.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mb-6">
              {activeCalcTab === "cost" && <CostCalculator />}
              {activeCalcTab === "pricing" && <PricingCalculator />}
              {activeCalcTab === "delivery" && <DeliveryCalculator />}
              {activeCalcTab === "rewards" && <RewardCalculator />}
              {activeCalcTab === "forecast" && <AnalyticsForecast />}
              {activeCalcTab === "inventory" && <InventoryForecast />}
            </div>
          </div>
        ) : activeTab === "overview" ? (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-12">
            <AnalyticsSection stats={stats} graphData={graphData} />
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
              <LiveOrders
                orders={orders}
                deliveryPartners={deliveryPartners}
                selectedPartner={selectedPartner}
                setSelectedPartner={setSelectedPartner}
                handleAssignPartner={handleAssignPartner}
                handleStatusUpdate={handleStatusUpdate}
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
              <MenuManagement
                menuItems={menuItems}
                handleToggleStock={handleToggleStock}
                handleDeleteItem={async (id) => {
                  if (window.confirm("Permanent removal from menu?")) {
                    try {
                      const res = await fetch(
                        `${BASEURL}/api/v1/products/${id}`,
                        getFetchOptions("DELETE"),
                      );
                      if (res.ok) {
                        const data = await res.json();
                        toast.success(data?.message || "Dish Erased");
                        fetchData();
                      } else {
                        const err = await res.json().catch(() => ({}));
                        toast.error(err?.message || "Failed to delete dish");
                      }
                    } catch {
                      toast.error("Network error deleting dish");
                    }
                  }
                }}
                openAddModal={() => {
                  setIsEditing(false);
                  setNewItem({
                    name: "",
                    price: "",
                    description: "",
                    category: "",
                    image: "",
                    isVeg: "true",
                    variants: [],
                    addons: [],
                  });
                  setShowModal(true);
                }}
                openEditModal={(item) => {
                  setIsEditing(true);
                  setEditId(item._id);
                  setNewItem({
                    ...item,
                    isVeg: item.isVeg ? "true" : "false",
                    variants: item.variants || [],
                    addons: item.addons || [],
                  });
                  setShowModal(true);
                }}
              />
            </div>
          </div>
        )}

        <ItemModal
          showModal={showModal}
          setShowModal={setShowModal}
          isEditing={isEditing}
          newItem={newItem}
          setNewItem={setNewItem}
          handleSubmitItem={handleSubmitItem}
        />
      </div>
    </div>
  );
};

export default RestaurantOwnerDashboard;
