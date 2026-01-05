import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Bell,
  BellOff,
  LayoutDashboard,
  Utensils,
} from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Modular Components
import AnalyticsSection from "../components/restaurant/AnalyticsSection";
import LiveOrders from "../components/restaurant/LiveOrders";
import MenuManagement from "../components/restaurant/MenuManagement";
import ItemModal from "../components/restaurant/ItemModal";

// Socket Instance
const socket = io(BASE_URL, { autoConnect: false });

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

  // 🛡️ Security Check
  useEffect(() => {
    if (userInfo && userInfo.role !== "restaurant_owner") {
      toast.error("Access Denied: Restaurant Owners Only");
      navigate("/");
    }
  }, [userInfo, navigate]);

  const getFetchOptions = (method = "GET", body = null) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInfo?.token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const fetchData = async () => {
    if (!userInfo) return;
    try {
      console.log(
        "Fetching from:",
        `${BASE_URL}/api/v1/orders/restaurant-orders`
      );
      console.log("Token:", userInfo.token);
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
            `${BASE_URL}/api/v1/orders/restaurant-orders`,
            getFetchOptions()
          )
        ),
        safeJson(
          fetch(
            `${BASE_URL}/api/v1/products/restaurant/${userInfo._id}`,
            getFetchOptions()
          )
        ),
        safeJson(
          fetch(`${BASE_URL}/api/v1/users/delivery-partners`, getFetchOptions())
        ),
        safeJson(
          fetch(`${BASE_URL}/api/v1/orders/sales-stats`, getFetchOptions())
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
          day: new Date(i._id).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          sales: i.sales,
        }))
      );

      setStats({
        revenue: safeOrders.reduce(
          (acc, o) => acc + (o.isPaid ? o.totalPrice : 0),
          0
        ),
        pending: safeOrders.filter(
          (o) => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
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
  };

  // 🔌 Socket Connection Logic
  useEffect(() => {
    fetchData();
    if (userInfo) {
      socket.connect();
      socket.emit("joinOrder", userInfo._id);

      socket.on("newOrderReceived", (newOrder) => {
        if (isSoundEnabled && audioPlayer.current) {
          audioPlayer.current
            .play()
            .catch((e) => console.log("Audio play failed", e));
        }
        toast.success(`🔔 NEW ORDER! #${newOrder._id.slice(-6)}`, {
          duration: 6000,
          icon: "🍕",
          style: {
            borderRadius: "12px",
            background: "#111827",
            color: "#fff",
            border: "1px solid #ef4444",
          },
        });
        fetchData(); // Refresh Data
      });
    }

    // Cleanup on Unmount
    return () => {
      socket.off("newOrderReceived");
      socket.disconnect();
    };
  }, [userInfo, isSoundEnabled]);

  // ✅ Fixed Duplicate Function
  const handleToggleStock = async (id) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/products/${id}/toggle-stock`,
      getFetchOptions("PATCH")
    );
    if (res.ok) {
      fetchData();
      toast.success("Stock status updated");
    }
  };

  const handleAssignPartner = async (orderId) => {
    const pId = selectedPartner[orderId];
    if (!pId) return toast.error("Please select a partner");

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/orders/${orderId}/assign`,
        getFetchOptions("PUT", { deliveryPartnerId: pId })
      );

      if (res.ok) {
        fetchData();
        toast.success("Pilot Assigned 🛵");
      } else {
        toast.error("Assignment failed");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/orders/${orderId}/status`,
      getFetchOptions("PUT", { status: newStatus })
    );
    if (res.ok) {
      toast.success(`Order set to ${newStatus}`);
      fetchData();
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${BASE_URL}/api/v1/products/${editId}`
      : `${BASE_URL}/api/v1/products`;

    const payload = {
      ...newItem,
      price: Number(newItem.price),
      isVeg: newItem.isVeg === "true",
      restaurantId: userInfo._id,
      variants: (newItem.variants || []).map((v) => ({
        ...v,
        price: Number(v.price),
      })),
      addons: (newItem.addons || []).map((a) => ({
        ...a,
        price: Number(a.price),
      })),
    };

    const res = await fetch(url, getFetchOptions(method, payload));
    if (res.ok) {
      setShowModal(false);
      fetchData();
      toast.success("Kitchen Menu Updated!");
    } else {
      toast.error("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 md:px-8 font-sans">
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
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <MenuManagement
              menuItems={menuItems}
              handleToggleStock={handleToggleStock}
              handleDeleteItem={async (id) => {
                if (window.confirm("Permanent removal from menu?")) {
                  await fetch(
                    `${BASE_URL}/api/v1/products/${id}`,
                    getFetchOptions("DELETE")
                  );
                  fetchData();
                  toast.success("Item removed");
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
        )}
      </div>

      <ItemModal
        showModal={showModal}
        setShowModal={setShowModal}
        isEditing={isEditing}
        newItem={newItem}
        setNewItem={setNewItem}
        handleSubmitItem={handleSubmitItem}
      />
    </div>
  );
};

export default RestaurantOwnerDashboard;
