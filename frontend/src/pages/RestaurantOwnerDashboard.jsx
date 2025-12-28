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
} from "lucide-react";
import { BASE_URL } from "../config";

const RestaurantOwnerDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);

  // States
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, pending: 0, delivered: 0 });

  // Assignment State
  const [selectedPartner, setSelectedPartner] = useState({});

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true", // 🟢 Default Veg (String for Dropdown)
  });

  // ================= FETCH DATA =================
  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${userInfo.token}` };
    setLoading(true);
    try {
      // 1. Fetch Orders
      const resOrders = await fetch(`${BASE_URL}/api/v1/orders`, { headers });
      const dataOrders = await resOrders.json();

      // 2. Fetch Delivery Partners
      const resPartners = await fetch(
        `${BASE_URL}/api/v1/users/delivery-partners`,
        { headers }
      );
      const dataPartners = await resPartners.json();

      if (resOrders.ok) {
        setOrders(dataOrders);
        setDeliveryPartners(dataPartners || []);

        // Calculate Stats
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

  // ================= ACTIONS =================

  // Assign Partner
  const handleAssignPartner = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) return alert("Please select a delivery partner first!");

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
        alert("Delivery Partner Assigned! 🚚");
        fetchData();
      } else {
        alert("Failed to assign partner");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      // 🟢 Convert String to Boolean
      const productData = {
        ...newItem,
        isVeg: newItem.isVeg === "true",
      };

      const res = await fetch(`${BASE_URL}/api/v1/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        alert("Item Added Successfully! 🍔");
        setShowModal(false);
        // Reset Form
        setNewItem({
          name: "",
          price: "",
          description: "",
          category: "",
          image: "",
          isVeg: "true",
        });
      } else {
        alert("Error adding item");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 tracking-tight">
              <ChefHat className="text-primary h-10 w-10" />
              Kitchen Dashboard
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Manage orders & assignments.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <PlusCircle size={20} /> Add Menu Item
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-2xl border border-gray-800 relative">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Pending
                </p>
                <h3 className="text-4xl font-extrabold text-white">
                  {stats.pending}
                </h3>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-xl text-yellow-400">
                <Clock size={24} />
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-2xl border border-gray-800 relative">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Revenue
                </p>
                <h3 className="text-4xl font-extrabold text-white">
                  ₹{stats.revenue}
                </h3>
              </div>
              <div className="bg-green-500/20 p-3 rounded-xl text-green-400">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-2xl border border-gray-800 relative">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Completed
                </p>
                <h3 className="text-4xl font-extrabold text-white">
                  {stats.delivered}
                </h3>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400">
                <ClipboardList size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Live Orders List */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
          <CookingPot className="text-primary" /> Live Orders
        </h2>

        {loading ? (
          <p className="text-center text-gray-500 animate-pulse">
            Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-center py-10">
            No active orders right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all shadow-xl"
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      #{order._id.substring(0, 6)}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.isPaid
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {order.isPaid ? "PAID" : "UNPAID"}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                      <User size={14} /> {order.user?.name}
                      <span className="text-gray-600">|</span>
                      <MapPin size={14} /> {order.shippingAddress?.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ₹{order.totalPrice}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6 bg-black/40 p-4 rounded-xl">
                  <h4 className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                    <ShoppingBag size={12} /> Order Items
                  </h4>
                  <ul className="space-y-1">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span className="text-white">
                          <span className="text-primary font-bold">
                            {item.qty}x
                          </span>{" "}
                          {item.name}
                        </span>
                        <span className="text-gray-500">
                          ₹{item.price * item.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Assignment Section */}
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                  <h4 className="text-gray-400 text-xs font-bold uppercase mb-2">
                    Delivery Assignment
                  </h4>

                  {order.deliveryPartner ? (
                    <div className="flex items-center gap-3 text-green-400 font-bold bg-green-500/10 p-2 rounded-lg">
                      <CheckCircle size={18} />
                      Assigned to: {order.deliveryPartner.name}
                    </div>
                  ) : order.isDelivered ? (
                    <div className="text-gray-500 font-bold">
                      Order Completed
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-black border border-gray-600 text-white p-2 rounded-lg text-sm focus:border-primary outline-none"
                        onChange={(e) =>
                          setSelectedPartner({
                            ...selectedPartner,
                            [order._id]: e.target.value,
                          })
                        }
                        value={selectedPartner[order._id] || ""}
                      >
                        <option value="">-- Select Delivery Boy --</option>
                        {deliveryPartners.map((partner) => (
                          <option key={partner._id} value={partner._id}>
                            {partner.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignPartner(order._id)}
                        className="bg-primary hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Add New Menu Item
            </h2>
            <form onSubmit={handleAddItem} className="space-y-4">
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
                {/* 🟢 Veg/Non-Veg Dropdown */}
                <select
                  className="w-1/2 bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:outline-none"
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
                placeholder="Category (e.g., Starter, Main Course)"
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
              ></textarea>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Create Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantOwnerDashboard;
