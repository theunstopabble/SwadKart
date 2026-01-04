import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Modular Components
import DashboardHeader from "../components/restaurant/DashboardHeader";
import AnalyticsSection from "../components/restaurant/AnalyticsSection";
import LiveOrders from "../components/restaurant/LiveOrders";
import MenuManagement from "../components/restaurant/MenuManagement";
import ItemModal from "../components/restaurant/ItemModal";

const socket = io(BASE_URL);

const RestaurantOwnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);

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
      // 1. Fetch Orders (This route should return orders specific to this restaurant ideally,
      // or filtering logic needs to happen if endpoint returns all orders)
      // Assuming GET /api/v1/orders returns all orders for now, filtering might be needed if user is not admin
      // But for Restaurant Owner, let's assume the endpoint is smart or we filter here.
      // NOTE: In a real app, backend should filter. Here we fetch all and filter by restaurant check if needed.
      const [resOrders, resMenu, resPartners, resGraph] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/orders`, getFetchOptions()), // Adjust endpoint if needed for specific restaurant orders
        fetch(
          `${BASE_URL}/api/v1/products/restaurant/${userInfo._id}`,
          getFetchOptions()
        ),
        fetch(`${BASE_URL}/api/v1/users/delivery-partners`, getFetchOptions()),
        fetch(`${BASE_URL}/api/v1/orders/sales-stats`, getFetchOptions()),
      ]);

      const dOrders = await resOrders.json();
      const dMenu = await resMenu.json();
      const dPartners = await resPartners.json();
      const dGraph = await resGraph.json();

      setOrders(dOrders || []);
      setMenuItems(dMenu || []);
      setDeliveryPartners(dPartners || []);

      // Graph Data Formatting
      setGraphData(
        dGraph.map((i) => ({
          day: new Date(i._id).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          sales: i.sales,
        }))
      );

      // Stats Calculation
      setStats({
        revenue: dOrders.reduce(
          (acc, o) => acc + (o.isPaid ? o.totalPrice : 0),
          0
        ),
        pending: dOrders.filter(
          (o) => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
        ).length,
        delivered: dOrders.filter((o) => o.orderStatus === "Delivered").length,
      });
    } catch (e) {
      toast.error("Sync error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (userInfo) {
      // Joining room with User ID because Restaurant Model uses User as Owner
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
        });
        fetchData();
      });
    }
    return () => socket.off("newOrderReceived");
  }, [userInfo, isSoundEnabled]);

  // Handlers
  const handleToggleStock = async (id) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/products/${id}/toggle-stock`,
      getFetchOptions("PATCH")
    );
    if (res.ok) {
      fetchData();
      toast.success("Stock Toggled");
    }
  };

  const handleAssignPartner = async (orderId) => {
    const pId = selectedPartner[orderId];
    if (!pId) return toast.error("Select partner");

    // Assuming backend has this route. If not, use updateOrderStatus route or similar.
    // Usually: PUT /api/v1/orders/:id with { deliveryPartner: pId, status: "Ready" }
    // Let's assume standard update logic or specific route if created.
    // If specific route doesn't exist, we might need to create it or update order manually.
    // Based on previous code, let's try the update logic:

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/orders/${orderId}/assign`, // Ensure this route exists in backend!
        getFetchOptions("PUT", { deliveryPartnerId: pId })
      );

      if (res.ok) {
        fetchData();
        toast.success("Driver Assigned 🛵");
      } else {
        // Fallback if specific route missing
        toast.error("Assignment failed. Check backend route.");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  // Status Update Handler (Accepted -> Preparing -> Ready)
  const handleStatusUpdate = async (orderId, newStatus) => {
    const res = await fetch(
      `${BASE_URL}/api/v1/orders/${orderId}/status`,
      getFetchOptions("PUT", { status: newStatus })
    );
    if (res.ok) {
      toast.success(`Order marked as ${newStatus}`);
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
      restaurantId: userInfo._id, // Explicitly link
      variants: newItem.variants.map((v) => ({ ...v, price: Number(v.price) })),
      addons: newItem.addons.map((a) => ({ ...a, price: Number(a.price) })),
    };

    const res = await fetch(url, getFetchOptions(method, payload));
    if (res.ok) {
      setShowModal(false);
      fetchData();
      toast.success("Menu Updated!");
    } else {
      toast.error("Operation failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 md:px-8 text-white font-sans">
      <audio ref={audioPlayer} src="/notification.mp3" preload="auto" />
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          isSoundEnabled={isSoundEnabled}
          setIsSoundEnabled={setIsSoundEnabled}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-primary h-10 w-10" />
          </div>
        ) : activeTab === "overview" ? (
          <div className="space-y-12">
            <AnalyticsSection stats={stats} graphData={graphData} />
            <LiveOrders
              orders={orders}
              deliveryPartners={deliveryPartners}
              selectedPartner={selectedPartner}
              setSelectedPartner={setSelectedPartner}
              handleAssignPartner={handleAssignPartner}
              handleStatusUpdate={handleStatusUpdate} // Passed down
            />
          </div>
        ) : (
          <MenuManagement
            menuItems={menuItems}
            handleToggleStock={handleToggleStock}
            handleDeleteItem={async (id) => {
              if (window.confirm("Delete?")) {
                await fetch(
                  `${BASE_URL}/api/v1/products/${id}`,
                  getFetchOptions("DELETE")
                );
                fetchData();
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
