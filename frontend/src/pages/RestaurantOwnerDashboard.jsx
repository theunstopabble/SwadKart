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
  Phone,
} from "lucide-react";
import { BASE_URL } from "../config";

const RestaurantOwnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, pending: 0, delivered: 0 });
  const [selectedPartner, setSelectedPartner] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${userInfo.token}` };
    setLoading(true);
    try {
      const resOrders = await fetch(`${BASE_URL}/api/v1/orders`, { headers });
      const dataOrders = await resOrders.json();

      const resMenu = await fetch(
        `${BASE_URL}/api/v1/products/restaurant/${userInfo._id}`,
        { headers }
      );
      const dataMenu = await resMenu.json();

      const resPartners = await fetch(
        `${BASE_URL}/api/v1/users/delivery-partners`,
        { headers }
      );
      const dataPartners = await resPartners.json();

      if (resOrders.ok) {
        setOrders(dataOrders);
        setMenuItems(dataMenu || []);
        setDeliveryPartners(dataPartners || []);

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

  const openEditModal = (item) => {
    setIsEditing(true);
    setEditId(item._id);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image: item.image,
      isVeg: item.isVeg ? "true" : "false", // 👈 String conversion for dropdown consistency
      orderIndex: item.orderIndex,
    });
    setShowModal(true);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`${BASE_URL}/api/v1/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReorder = async (index, direction) => {
    const newItems = [...menuItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMenuItems(newItems);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo.token}`,
      };
      await fetch(`${BASE_URL}/api/v1/products/${newItems[index]._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ orderIndex: index }),
      });
      await fetch(`${BASE_URL}/api/v1/products/${newItems[targetIndex]._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ orderIndex: targetIndex }),
      });
      fetchData();
    } catch (error) {
      console.error("Reorder failed", error);
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      // 👈 Authentic Boolean Conversion
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
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

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
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <ChefHat className="text-primary h-10 w-10" /> Kitchen Dashboard
          </h1>
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

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Pending
                  </p>
                  <h3 className="text-3xl font-bold">{stats.pending}</h3>
                </div>
                <Clock className="text-yellow-400" />
              </div>
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Revenue
                  </p>
                  <h3 className="text-3xl font-bold">₹{stats.revenue}</h3>
                </div>
                <TrendingUp className="text-green-400" />
              </div>
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Completed
                  </p>
                  <h3 className="text-3xl font-bold">{stats.delivered}</h3>
                </div>
                <ClipboardList className="text-blue-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
              <CookingPot className="text-primary" /> Live Orders
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-primary/30 transition-all"
                >
                  <div className="flex justify-between mb-4 border-b border-gray-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        #{order._id.substring(0, 6)}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase font-extrabold tracking-wider ${
                            order.isPaid
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {order.isPaid ? "PAID" : "UNPAID"}
                        </span>
                      </h3>

                      {/* 👇 AUTHENTIC SHIPPING DETAILS FROM DATABASE */}
                      <div className="mt-3 space-y-2">
                        <p className="text-white font-bold flex items-center gap-2">
                          <User size={14} className="text-primary" />{" "}
                          {order.shippingAddress?.fullName}
                        </p>
                        <p className="text-gray-400 text-sm flex items-start gap-2 leading-relaxed">
                          <MapPin
                            size={14}
                            className="mt-1 flex-shrink-0 text-primary"
                          />
                          <span>
                            {order.shippingAddress?.address},{" "}
                            {order.shippingAddress?.city}, <br />
                            {order.shippingAddress?.state} -{" "}
                            {order.shippingAddress?.postalCode}
                          </span>
                        </p>
                        <p className="text-primary font-mono font-bold text-sm bg-primary/10 w-fit px-3 py-1 rounded-lg border border-primary/20 flex items-center gap-2">
                          <Phone size={14} /> {order.shippingAddress?.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{order.totalPrice}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {order.paymentMethod} Payment
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 italic">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-3 rounded-xl mb-4 border border-gray-800">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
                      Order Items
                    </p>
                    {order.orderItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm mb-1.5 text-gray-300"
                      >
                        <span>
                          <span className="text-primary font-bold">
                            {item.qty}x
                          </span>{" "}
                          {item.name}
                        </span>
                        <span className="font-mono text-gray-400">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!order.isDelivered && !order.deliveryPartner && (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-black border border-gray-700 text-white p-2 rounded-lg text-sm focus:outline-none focus:border-primary transition-all"
                        onChange={(e) =>
                          setSelectedPartner({
                            ...selectedPartner,
                            [order._id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Assign Delivery Partner</option>
                        {deliveryPartners.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignPartner(order._id)}
                        className="bg-primary hover:bg-red-600 px-6 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95 text-sm"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                  {order.deliveryPartner && (
                    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg">
                      <p className="text-green-400 text-xs font-bold flex items-center gap-2 justify-center italic">
                        <Truck size={14} /> {order.deliveryPartner.name} is
                        handling delivery
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "menu" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UtensilsCrossed className="text-primary" /> Manage Menu (
                {menuItems.length})
              </h2>
              <button
                onClick={openAddModal}
                className="bg-primary hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <PlusCircle size={20} /> Add Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item, index) => (
                <div
                  key={item._id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative hover:border-primary/50 transition-all shadow-md"
                >
                  <div className="h-40 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span
                      className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold ${
                        item.isVeg === true || item.isVeg === "true"
                          ? "bg-green-600"
                          : "bg-red-600"
                      }`}
                    >
                      {item.isVeg === true || item.isVeg === "true"
                        ? "VEG"
                        : "NON-VEG"}
                    </span>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(index, -1)}
                        disabled={index === 0}
                        className="bg-black/50 hover:bg-primary p-1 rounded text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 1)}
                        disabled={index === menuItems.length - 1}
                        className="bg-black/50 hover:bg-primary p-1 rounded text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 bg-gray-800 hover:bg-blue-600 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="flex-1 bg-gray-800 hover:bg-red-600 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {isEditing ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleSubmitItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farmhouse Pizza"
                  className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-all"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="299"
                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-all"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="w-1/2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                    Type
                  </label>
                  <select
                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-all"
                    value={newItem.isVeg}
                    onChange={(e) =>
                      setNewItem({ ...newItem, isVeg: e.target.value })
                    }
                  >
                    <option value="true">🟢 Veg</option>
                    <option value="false">🔴 Non-Veg</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pizza, Burger"
                  className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-all"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://unsplash.com/..."
                  className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-all"
                  value={newItem.image}
                  onChange={(e) =>
                    setNewItem({ ...newItem, image: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Description
                </label>
                <textarea
                  placeholder="Tell customers about this dish..."
                  className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white h-24 focus:outline-none focus:border-primary transition-all resize-none"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95"
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
