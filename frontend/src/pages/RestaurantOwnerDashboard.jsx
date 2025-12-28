import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  CookingPot,
  Clock,
  PlusCircle,
  ChefHat,
  ClipboardList,
  TrendingUp,
  X,
  User,
  MapPin,
  ShoppingBag,
  CheckCircle,
  Truck,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  UtensilsCrossed,
} from "lucide-react";
import { BASE_URL } from "../config";

const RestaurantOwnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);

  // Tabs: 'overview' or 'menu'
  const [activeTab, setActiveTab] = useState("overview");

  // Data States
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]); // 👈 For Menu Management
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, pending: 0, delivered: 0 });

  // Assignment State
  const [selectedPartner, setSelectedPartner] = useState({});

  // Modal State (Add/Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 👈 Track editing mode
  const [editId, setEditId] = useState(null);

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true",
    orderIndex: 0,
  });

  // ================= FETCH DATA =================
  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${userInfo.token}` };
    setLoading(true);
    try {
      // 1. Fetch Orders
      const resOrders = await fetch(`${BASE_URL}/api/v1/orders`, { headers });
      const dataOrders = await resOrders.json();

      // 2. Fetch Menu Items (For Management)
      const resMenu = await fetch(
        `${BASE_URL}/api/v1/products/restaurant/${userInfo._id}`,
        { headers }
      );
      const dataMenu = await resMenu.json();

      // 3. Fetch Delivery Partners
      const resPartners = await fetch(
        `${BASE_URL}/api/v1/users/delivery-partners`,
        { headers }
      );
      const dataPartners = await resPartners.json();

      if (resOrders.ok) {
        setOrders(dataOrders);
        setMenuItems(dataMenu || []);
        setDeliveryPartners(dataPartners || []);

        // Stats Logic
        const totalRevenue = dataOrders.reduce(
          (acc, order) => acc + (order.isPaid ? order.totalPrice : 0),
          0
        );
        const pendingCount = dataOrders.filter((o) => !o.isDelivered).length;
        const deliveredCount = dataOrders.filter((o) => o.isDelivered).length;

        setStats({
          revenue: totalRevenue,
          pending: pendingCount,
          delivered: deliveredCount,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) fetchData();
  }, [userInfo]);

  // ================= MENU ACTIONS (Edit, Delete, Reorder) =================

  // Open Modal for Create
  const openAddModal = () => {
    setIsEditing(false);
    setNewItem({
      name: "",
      price: "",
      description: "",
      category: "",
      image: "",
      isVeg: "true",
      orderIndex: menuItems.length,
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const openEditModal = (item) => {
    setIsEditing(true);
    setEditId(item._id);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image: item.image,
      isVeg: item.isVeg ? "true" : "false",
      orderIndex: item.orderIndex,
    });
    setShowModal(true);
  };

  // Handle Delete
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`${BASE_URL}/api/v1/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      alert("Item Deleted!");
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // Handle Reorder (Move Up/Down)
  const handleReorder = async (index, direction) => {
    const newItems = [...menuItems];
    // Direction: -1 for UP, +1 for DOWN
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items in frontend array
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Optimistic Update UI
    setMenuItems(newItems);

    // Call API to update indexes for swapped items
    try {
      // Update first item
      await fetch(`${BASE_URL}/api/v1/products/${newItems[index]._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({ orderIndex: index }), // Update index based on array position
      });
      // Update second item
      await fetch(`${BASE_URL}/api/v1/products/${newItems[targetIndex]._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({ orderIndex: targetIndex }),
      });
      // Refresh to sync
      fetchData();
    } catch (error) {
      console.error("Reorder failed", error);
    }
  };

  // Submit Form (Create or Update)
  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      const productData = { ...newItem, isVeg: newItem.isVeg === "true" };

      let url = `${BASE_URL}/api/v1/products`;
      let method = "POST";

      if (isEditing) {
        url = `${BASE_URL}/api/v1/products/${editId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        alert(isEditing ? "Item Updated!" : "Item Added!");
        setShowModal(false);
        fetchData();
      } else {
        alert("Error saving item");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Assign Partner Logic
  const handleAssignPartner = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) return alert("Select a partner!");
    try {
      const res = await fetch(`${BASE_URL}/api/v1/orders/${orderId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({ deliveryPartnerId: partnerId }),
      });
      if (res.ok) {
        alert("Assigned!");
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white relative">
      <div className="max-w-7xl mx-auto">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <ChefHat className="text-primary h-10 w-10" /> Kitchen Dashboard
            </h1>
          </div>
          <div className="flex bg-gray-900 rounded-full p-1 border border-gray-800">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Orders & Stats
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === "menu"
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Menu Management
            </button>
          </div>
        </div>

        {/* ==================== TAB: OVERVIEW (Stats & Orders) ==================== */}
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* ... (Same Stats Code as before) ... */}
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold">PENDING</p>
                  <h3 className="text-3xl font-bold">{stats.pending}</h3>
                </div>
                <Clock className="text-yellow-400" />
              </div>
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold">REVENUE</p>
                  <h3 className="text-3xl font-bold">₹{stats.revenue}</h3>
                </div>
                <TrendingUp className="text-green-400" />
              </div>
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold">COMPLETED</p>
                  <h3 className="text-3xl font-bold">{stats.delivered}</h3>
                </div>
                <ClipboardList className="text-blue-400" />
              </div>
            </div>

            {/* Orders List */}
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
              <CookingPot className="text-primary" /> Live Orders
            </h2>
            {/* ... (Same Orders Mapping Code) ... */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
                >
                  {/* Order Header */}
                  <div className="flex justify-between mb-4 border-b border-gray-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        #{order._id.substring(0, 6)}{" "}
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          {order.isPaid ? "PAID" : "UNPAID"}
                        </span>
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {order.user?.name} | {order.shippingAddress?.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{order.totalPrice}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-black/40 p-3 rounded-xl mb-4">
                    {order.orderItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm mb-1 text-gray-300"
                      >
                        <span>
                          <span className="text-primary font-bold">
                            {item.qty}x
                          </span>{" "}
                          {item.name}
                        </span>
                        <span>₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assignment */}
                  {!order.isDelivered && !order.deliveryPartner && (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-black border border-gray-600 text-white p-2 rounded"
                        onChange={(e) =>
                          setSelectedPartner({
                            ...selectedPartner,
                            [order._id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Partner</option>
                        {deliveryPartners.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignPartner(order._id)}
                        className="bg-primary px-4 py-2 rounded font-bold"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                  {order.deliveryPartner && (
                    <p className="text-green-400 text-sm font-bold flex items-center gap-2">
                      <CheckCircle size={16} /> {order.deliveryPartner.name}{" "}
                      Assigned
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ==================== TAB: MENU MANAGEMENT ==================== */}
        {activeTab === "menu" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UtensilsCrossed className="text-primary" /> Manage Menu (
                {menuItems.length})
              </h2>
              <button
                onClick={openAddModal}
                className="bg-primary hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 shadow-lg"
              >
                <PlusCircle size={20} /> Add Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item, index) => (
                <div
                  key={item._id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative hover:border-primary/50 transition-all"
                >
                  {/* Image & Badge */}
                  <div className="h-40 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold ${
                        item.isVeg ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {item.isVeg ? "VEG" : "NON-VEG"}
                    </span>
                    {/* Ordering Buttons */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(index, -1)}
                        disabled={index === 0}
                        className="bg-black/50 hover:bg-primary p-1 rounded text-white disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 1)}
                        disabled={index === menuItems.length - 1}
                        className="bg-black/50 hover:bg-primary p-1 rounded text-white disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg truncate w-3/4">
                        {item.name}
                      </h3>
                      <span className="text-primary font-bold">
                        ₹{item.price}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mb-4 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 bg-gray-800 hover:bg-blue-600 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="flex-1 bg-gray-800 hover:bg-red-600 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {isEditing ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleSubmitItem} className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                required
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  className="w-1/2 bg-gray-800 border-gray-700 rounded-lg p-3 text-white"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  required
                />
                <select
                  className="w-1/2 bg-gray-800 border-gray-700 rounded-lg p-3 text-white"
                  value={newItem.isVeg}
                  onChange={(e) =>
                    setNewItem({ ...newItem, isVeg: e.target.value })
                  }
                >
                  <option value="true">🟢 Veg</option>
                  <option value="false">🔴 Non-Veg</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Category"
                className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white"
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Image URL"
                className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white"
                value={newItem.image}
                onChange={(e) =>
                  setNewItem({ ...newItem, image: e.target.value })
                }
              />
              <textarea
                placeholder="Description"
                className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white h-24"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
                required
              />
              <button
                type="submit"
                className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg"
              >
                {isEditing ? "Update Item" : "Create Item"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantOwnerDashboard;
