import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Plus,
  PlusCircle,
  TrendingUp,
  X,
  Edit2,
  CheckCircle,
  Clock,
  Truck,
  User,
  Calendar,
  Eye,
  MapPin,
} from "lucide-react";
import { BASE_URL } from "../config";

const AdminDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showDummyModal, setShowDummyModal] = useState(false);

  // Order Details Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Data
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0 });
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);

  // Forms & Selections
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [editingShop, setEditingShop] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState({});

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true", // 🟢 Default Veg (String for Dropdown)
  });

  const [newShop, setNewShop] = useState({
    name: "",
    email: "",
    password: "",
    image: "",
  });
  const [dummyShopData, setDummyShopData] = useState({ name: "", image: "" });

  // ================= FETCH DATA =================
  const fetchAllData = async () => {
    const headers = { Authorization: `Bearer ${userInfo.token}` };

    try {
      // 1. Restaurants
      const resRest = await fetch(`${BASE_URL}/api/v1/users/restaurants`, {
        headers,
      });
      const dataRest = await resRest.json();
      if (resRest.ok) {
        setRestaurants(dataRest);
        setStats((prev) => ({ ...prev, users: dataRest.length }));
      }

      // 2. Orders
      const resOrders = await fetch(`${BASE_URL}/api/v1/orders/admin/all`, {
        headers,
      });
      const dataOrders = await resOrders.json();
      if (resOrders.ok) {
        setOrders(dataOrders);
        const totalRev = dataOrders.reduce(
          (acc, order) => acc + (order.isPaid ? order.totalPrice : 0),
          0
        );
        setStats((prev) => ({
          ...prev,
          revenue: totalRev,
          orders: dataOrders.length,
        }));
      }

      // 3. Delivery Partners
      const resPartners = await fetch(
        `${BASE_URL}/api/v1/users/delivery-partners`,
        { headers }
      );
      const dataPartners = await resPartners.json();
      if (resPartners.ok) setDeliveryPartners(dataPartners);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (userInfo) fetchAllData();
  }, [userInfo, activeTab]);

  // ================= ACTIONS =================
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
        alert("Assigned! 🚚");
        fetchAllData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Generic Handlers
  const handleCreateDummyShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/admin/create-dummy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify(dummyShopData),
      });
      if (res.ok) {
        setShowDummyModal(false);
        fetchAllData();
        alert("Dummy Shop Created");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/admin/create-shop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify(newShop),
      });
      if (res.ok) {
        setShowAddShopModal(false);
        fetchAllData();
        alert("Shop Created");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedRestaurant) return alert("Select a restaurant");
    try {
      // 🟢 Fix: Convert "true"/"false" string to boolean
      const productData = {
        ...newItem,
        isVeg: newItem.isVeg === "true",
        restaurantId: selectedRestaurant,
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
        setShowItemModal(false);
        alert("Item Added");
        // Reset form
        setNewItem({
          name: "",
          price: "",
          description: "",
          category: "",
          image: "",
          isVeg: "true",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/${editingShop._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({
          name: editingShop.name,
          image: editingShop.image,
        }),
      });
      if (res.ok) {
        setShowShopModal(false);
        fetchAllData();
        alert("Updated");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (shop) => {
    setEditingShop(shop);
    setShowShopModal(true);
  };

  const getStatusBadge = (order) => {
    if (order.isDelivered)
      return (
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
          <CheckCircle size={12} /> DELIVERED
        </span>
      );
    if (order.deliveryPartner)
      return (
        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
          <Truck size={12} /> ON WAY
        </span>
      );
    return (
      <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
        <Clock size={12} /> PENDING
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 flex items-center gap-3">
          👑 Admin Control Center
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-10 border-b border-gray-800 pb-4">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "orders", label: "Manage Orders", icon: ShoppingBag },
            { id: "shops", label: "Manage Shops", icon: Store },
            { id: "menu", label: "Manage Menu", icon: UtensilsCrossed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg text-green-500">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Revenue
                </p>
                <h3 className="text-2xl font-bold">
                  ₹{stats.revenue.toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Total Orders
                </p>
                <h3 className="text-2xl font-bold">{stats.orders}</h3>
              </div>
            </div>
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg text-orange-500">
                <Store size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase">
                  Restaurants
                </p>
                <h3 className="text-2xl font-bold">{stats.users}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab (UPDATED TABLE) */}
        {activeTab === "orders" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-400">
                <thead className="bg-black text-gray-200 uppercase font-bold text-sm">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Delivery Partner</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-800/50">
                      <td className="p-4 text-primary font-mono text-xs">
                        #{o._id.substring(0, 6)}
                      </td>
                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />{" "}
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(o.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-white">
                        {/* 🟢 Fix: Display Full Name */}
                        {o.shippingAddress?.fullName || o.user?.name}
                      </td>
                      <td className="p-4 font-bold text-white">
                        ₹{o.totalPrice}
                      </td>
                      <td className="p-4">{getStatusBadge(o)}</td>

                      {/* Delivery Partner Logic */}
                      <td className="p-4">
                        {o.deliveryPartner ? (
                          <span className="text-blue-400 flex items-center gap-1 font-bold">
                            <User size={14} /> {o.deliveryPartner.name}
                          </span>
                        ) : (
                          <select
                            className="bg-black border border-gray-700 text-white p-2 rounded text-sm outline-none"
                            onChange={(e) =>
                              setSelectedPartner({
                                ...selectedPartner,
                                [o._id]: e.target.value,
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
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 flex items-center gap-2">
                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Assign Button */}
                        {!o.deliveryPartner && !o.isDelivered && (
                          <button
                            onClick={() => handleAssignPartner(o._id)}
                            className="bg-primary hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shops Tab */}
        {activeTab === "shops" && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Store className="text-primary" /> Restaurants
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDummyModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 shadow-lg"
                >
                  <PlusCircle size={20} /> Add Dummy Shop
                </button>
                <button
                  onClick={() => setShowAddShopModal(true)}
                  className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} /> Full Register
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((shop) => (
                <div
                  key={shop._id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative"
                >
                  <div className="h-48 relative">
                    <img
                      src={
                        shop.image ||
                        "https://images.unsplash.com/photo-1552566626-52f8b828add9"
                      }
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(shop)}
                        className="bg-white text-black font-bold py-2 px-6 rounded-full flex items-center gap-2"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {shop.name}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {shop.email.includes("@dummy") ? (
                        <span className="text-yellow-500 text-xs border border-yellow-500/30 px-2 rounded">
                          DUMMY
                        </span>
                      ) : (
                        shop.email
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === "menu" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <UtensilsCrossed className="text-primary" /> Update Menu
            </h2>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full md:w-1/2 bg-black border border-gray-700 rounded-xl p-4 text-white focus:outline-none mb-6"
            >
              <option value="">-- Select Restaurant --</option>
              {restaurants.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
            {selectedRestaurant && (
              <div className="text-center p-10 border-2 border-dashed border-gray-700 rounded-2xl bg-black/20">
                <p className="text-gray-400 mb-4">
                  Adding items for:{" "}
                  <strong className="text-white">
                    {
                      restaurants.find((r) => r._id === selectedRestaurant)
                        ?.name
                    }
                  </strong>
                </p>
                <button
                  onClick={() => setShowItemModal(true)}
                  className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 shadow-lg mx-auto"
                >
                  <Plus size={20} /> Add Menu Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modals Section (Create Shops/Items) */}
        {showDummyModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative">
              <button
                onClick={() => setShowDummyModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">Add Dummy Shop</h2>
              <form onSubmit={handleCreateDummyShop} className="space-y-4">
                <input
                  type="text"
                  placeholder="Shop Name"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={dummyShopData.name}
                  onChange={(e) =>
                    setDummyShopData({ ...dummyShopData, name: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Image URL"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={dummyShopData.image}
                  onChange={(e) =>
                    setDummyShopData({
                      ...dummyShopData,
                      image: e.target.value,
                    })
                  }
                />
                <button
                  type="submit"
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-xl"
                >
                  Create
                </button>
              </form>
            </div>
          </div>
        )}

        {showItemModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative">
              <button
                onClick={() => setShowItemModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">Add Menu Item</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
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
                    className="w-1/2 bg-gray-800 border-gray-700 p-3 rounded text-white"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                    required
                  />
                  {/* 🟢 NEW: Veg/Non-Veg Dropdown */}
                  <select
                    className="w-1/2 bg-gray-800 border-gray-700 p-3 rounded text-white focus:outline-none"
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
                  placeholder="Category (e.g., Pizza, Burger)"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                  required
                />

                <input
                  type="text"
                  placeholder="Image URL"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={newItem.image}
                  onChange={(e) =>
                    setNewItem({ ...newItem, image: e.target.value })
                  }
                />
                <textarea
                  placeholder="Description"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white h-24"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  required
                ></textarea>
                <button
                  type="submit"
                  className="w-full bg-primary font-bold py-3 rounded-xl"
                >
                  Add Item
                </button>
              </form>
            </div>
          </div>
        )}

        {showAddShopModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative">
              <button
                onClick={() => setShowAddShopModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">Register New Shop</h2>
              <form onSubmit={handleAddShop} className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={newShop.name}
                  onChange={(e) =>
                    setNewShop({ ...newShop, name: e.target.value })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={newShop.email}
                  onChange={(e) =>
                    setNewShop({ ...newShop, email: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={newShop.password}
                  onChange={(e) =>
                    setNewShop({ ...newShop, password: e.target.value })
                  }
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl"
                >
                  Register
                </button>
              </form>
            </div>
          </div>
        )}

        {showShopModal && editingShop && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative">
              <button
                onClick={() => setShowShopModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">Edit Shop</h2>
              <form onSubmit={handleUpdateShop} className="space-y-4">
                <input
                  type="text"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={editingShop.name}
                  onChange={(e) =>
                    setEditingShop({ ...editingShop, name: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={editingShop.image}
                  onChange={(e) =>
                    setEditingShop({ ...editingShop, image: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl"
                >
                  Save
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                Order #{selectedOrder._id.substring(0, 8)}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    selectedOrder.isPaid
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {selectedOrder.isPaid ? "PAID" : "UNPAID"}
                </span>
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {new Date(selectedOrder.createdAt).toString()}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-black/40 p-4 rounded-xl">
                  <h3 className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <User size={14} /> Customer Details
                  </h3>
                  <p className="font-bold text-white">
                    {/* 🟢 Fix: Display Shipping Name or Fallback to User Name */}
                    {selectedOrder.shippingAddress?.fullName ||
                      selectedOrder.user?.name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {selectedOrder.user?.email}
                  </p>
                  <p className="text-primary text-sm mt-1 font-mono">
                    {/* 🟢 Fix: Display Shipping Phone or Fallback to User Phone */}
                    📞{" "}
                    {selectedOrder.shippingAddress?.phone ||
                      selectedOrder.user?.phone ||
                      "No Phone"}
                  </p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl">
                  <h3 className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <MapPin size={14} /> Shipping Address
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {selectedOrder.shippingAddress?.address},{" "}
                    {selectedOrder.shippingAddress?.city}
                    <br />
                    {/* 🟢 Fix: Display State and Postal Code */}
                    {selectedOrder.shippingAddress?.state
                      ? `${selectedOrder.shippingAddress.state}, `
                      : ""}
                    {selectedOrder.shippingAddress?.postalCode}
                    <br />
                    {selectedOrder.shippingAddress?.country}
                  </p>
                </div>
              </div>

              <div className="bg-black/40 p-4 rounded-xl">
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                  <ShoppingBag size={14} /> Order Items
                </h3>
                <div className="space-y-3">
                  {selectedOrder.orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.qty} x ₹{item.price}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-white">
                        ₹{item.qty * item.price}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="text-xl font-extrabold text-primary">
                    ₹{selectedOrder.totalPrice}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
