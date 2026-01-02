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
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
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
      const [resOrders, resMenu, resPartners, resGraph] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/orders`, getFetchOptions()),
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
      setGraphData(
        dGraph.map((i) => ({
          day: new Date(i._id).toLocaleDateString("en-US", {
            weekday: "short",
          }),
          sales: i.sales,
        }))
      );

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
      socket.emit("joinOrder", userInfo._id);
      socket.on("newOrderReceived", (newOrder) => {
        if (isSoundEnabled && audioPlayer.current)
          audioPlayer.current.play().catch(() => {});
        toast.success(`🔔 NEW ORDER! #${newOrder._id.slice(-6)}`, {
          duration: 6000,
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
    const res = await fetch(
      `${BASE_URL}/api/v1/orders/${orderId}/assign`,
      getFetchOptions("PUT", { deliveryPartnerId: pId })
    );
    if (res.ok) {
      fetchData();
      toast.success("Driver Assigned 🛵");
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${BASE_URL}/api/v1/products/${editId}`
      : `${BASE_URL}/api/v1/products`;
    const res = await fetch(
      url,
      getFetchOptions(method, { ...newItem, isVeg: newItem.isVeg === "true" })
    );
    if (res.ok) {
      setShowModal(false);
      fetchData();
      toast.success("Menu Updated!");
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
              setNewItem(item);
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
