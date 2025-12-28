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
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  User,
  Calendar,
  Eye,
  MapPin,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { BASE_URL } from "../config";

const AdminDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals & States
  const [showItemModal, setShowItemModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showDummyModal, setShowDummyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Edit Mode for Items
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  // Data
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0 });
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]); // 👈 Store selected restaurant's menu
  const [deliveryPartners, setDeliveryPartners] = useState([]);

  // Selections
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [editingShop, setEditingShop] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState({});

  // Forms
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true",
    orderIndex: 0,
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
      const resRest = await fetch(`${BASE_URL}/api/v1/users/restaurants`, {
        headers,
      });
      const dataRest = await resRest.json();
      if (resRest.ok) {
        setRestaurants(dataRest);
        setStats((prev) => ({ ...prev, users: dataRest.length }));
      }

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

  // Fetch Menu when Restaurant Selected
  useEffect(() => {
    if (selectedRestaurant) {
      const fetchMenu = async () => {
        const res = await fetch(
          `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`
        );
        const data = await res.json();
        setMenuItems(data);
      };
      fetchMenu();
    } else {
      setMenuItems([]);
    }
  }, [selectedRestaurant]);

  // ================= ACTIONS =================

  // Reorder Item (Admin)
  const handleReorder = async (index, direction) => {
    const newItems = [...menuItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMenuItems(newItems); // Optimistic

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
    } catch (error) {
      console.error(error);
    }
  };

  // Delete Restaurant
  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm("Delete this restaurant AND all its menu items?"))
      return;
    try {
      await fetch(`${BASE_URL}/api/v1/users/${id}`, {
        // Backend route must exist for user delete
        method: "DELETE",
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      alert("Restaurant Deleted");
      fetchAllData();
    } catch (error) {
      console.error(error);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete item?")) return;
    try {
      await fetch(`${BASE_URL}/api/v1/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      // Refresh menu list
      const res = await fetch(
        `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`
      );
      setMenuItems(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  // Open Edit Item Modal
  const openEditItemModal = (item) => {
    setIsEditingItem(true);
    setEditItemId(item._id);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image: item.image,
      isVeg: item.isVeg ? "true" : "false",
      orderIndex: item.orderIndex,
    });
    setShowItemModal(true);
  };

  const openAddItemModal = () => {
    setIsEditingItem(false);
    setNewItem({
      name: "",
      price: "",
      description: "",
      category: "",
      image: "",
      isVeg: "true",
      orderIndex: menuItems.length,
    });
    setShowItemModal(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (!selectedRestaurant) return alert("Select a restaurant");
    try {
      const productData = {
        ...newItem,
        isVeg: newItem.isVeg === "true",
        restaurantId: selectedRestaurant,
      };
      let url = `${BASE_URL}/api/v1/products`;
      let method = "POST";

      if (isEditingItem) {
        url = `${BASE_URL}/api/v1/products/${editItemId}`;
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
        setShowItemModal(false);
        const menuRes = await fetch(
          `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`
        );
        setMenuItems(await menuRes.json());
        alert(isEditingItem ? "Item Updated" : "Item Added");
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

  const handleAssignPartner = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) return alert("Select partner");
    await fetch(`${BASE_URL}/api/v1/orders/${orderId}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo.token}`,
      },
      body: JSON.stringify({ deliveryPartnerId: partnerId }),
    });
    alert("Assigned");
    fetchAllData();
  };

  const handleCreateDummyShop = async (e) => {
    e.preventDefault();
    await fetch(`${BASE_URL}/api/v1/users/admin/create-dummy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo.token}`,
      },
      body: JSON.stringify(dummyShopData),
    });
    setShowDummyModal(false);
    fetchAllData();
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    await fetch(`${BASE_URL}/api/v1/users/admin/create-shop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo.token}`,
      },
      body: JSON.stringify(newShop),
    });
    setShowAddShopModal(false);
    fetchAllData();
  };

  // Helpers
  const getStatusBadge = (order) => {
    /* Same as before */
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-400">
                <thead className="bg-black text-gray-200 uppercase font-bold text-sm">
                  <tr>
                    <th className="p-4">ID</th>
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
                      <td className="p-4 font-bold text-white">
                        {o.shippingAddress?.fullName || o.user?.name}
                      </td>
                      <td className="p-4 font-bold text-white">
                        ₹{o.totalPrice}
                      </td>
                      <td className="p-4">{getStatusBadge(o)}</td>
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
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-2 bg-gray-700 rounded-lg text-white"
                        >
                          <Eye size={16} />
                        </button>
                        {!o.deliveryPartner && !o.isDelivered && (
                          <button
                            onClick={() => handleAssignPartner(o._id)}
                            className="bg-primary text-white px-3 py-1 rounded text-xs font-bold"
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

        {/* Shops Tab (Updated with Delete) */}
        {activeTab === "shops" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Store className="text-primary" /> Restaurants
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDummyModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2"
                >
                  <PlusCircle size={20} /> Add Dummy
                </button>
                <button
                  onClick={() => setShowAddShopModal(true)}
                  className="bg-primary hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2"
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
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                      <button
                        onClick={() => {
                          setEditingShop(shop);
                          setShowShopModal(true);
                        }}
                        className="bg-white text-black font-bold py-2 px-4 rounded-full flex items-center gap-2"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRestaurant(shop._id)}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
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

        {/* Menu Tab (FULL FEATURES: Reorder, Edit, Delete) */}
        {activeTab === "menu" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <UtensilsCrossed className="text-primary" /> Live Menu Editor
            </h2>
            <div className="flex gap-4 mb-8">
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full md:w-1/2 bg-black border border-gray-700 rounded-xl p-4 text-white focus:outline-none"
              >
                <option value="">-- Select Restaurant to Edit Menu --</option>
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {selectedRestaurant && (
                <button
                  onClick={openAddItemModal}
                  className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} /> Add Item
                </button>
              )}
            </div>

            {selectedRestaurant && menuItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {menuItems.map((item, index) => (
                  <div
                    key={item._id}
                    className="bg-black/40 border border-gray-700 rounded-xl overflow-hidden group relative hover:border-primary transition-all"
                  >
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
                      {/* Reorder Controls */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button
                          onClick={() => handleReorder(index, -1)}
                          disabled={index === 0}
                          className="bg-black/60 hover:bg-primary p-1 rounded text-white disabled:opacity-30"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleReorder(index, 1)}
                          disabled={index === menuItems.length - 1}
                          className="bg-black/60 hover:bg-primary p-1 rounded text-white disabled:opacity-30"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between font-bold mb-1">
                        <h3>{item.name}</h3>
                        <span className="text-primary">₹{item.price}</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="flex-1 bg-gray-800 hover:bg-blue-600 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="flex-1 bg-gray-800 hover:bg-red-600 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedRestaurant && menuItems.length === 0 && (
              <p className="text-center text-gray-500">
                No items found for this restaurant.
              </p>
            )}
          </div>
        )}

        {/* Modals */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 relative">
              <button
                onClick={() => setShowItemModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">
                {isEditingItem ? "Edit Item" : "Add Item"}
              </h2>
              <form onSubmit={handleSubmitItem} className="space-y-4">
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
                  <select
                    className="w-1/2 bg-gray-800 border-gray-700 p-3 rounded text-white"
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
                  {isEditingItem ? "Update" : "Add"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Shop / Edit Shop / Dummy Modals can remain similar to previous simpler versions or added here if needed fully expanded */}
        {showAddShopModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 relative">
              <button
                onClick={() => setShowAddShopModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4">Register Shop</h2>
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

        {showDummyModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 relative">
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
                  placeholder="Name"
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

        {showShopModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 relative">
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
                  required
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
                  Update
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Selected Order Modal (Same as before) */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl p-6 relative">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-1">
                Order #{selectedOrder._id.substring(0, 8)}{" "}
                <span className="text-xs bg-primary px-2 py-1 rounded-full">
                  {selectedOrder.isPaid ? "PAID" : "UNPAID"}
                </span>
              </h2>
              {/* ... (Existing Order Details UI) ... */}
              <div className="mt-4">
                <h3 className="font-bold text-gray-400 uppercase text-xs mb-2">
                  Items
                </h3>
                {selectedOrder.orderItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b border-gray-800 pb-2 mb-2"
                  >
                    <span>
                      {item.qty}x {item.name}
                    </span>
                    <span>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
