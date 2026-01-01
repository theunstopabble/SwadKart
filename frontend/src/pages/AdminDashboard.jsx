import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast"; // Hot Toast is better
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
  Phone,
  Tag,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Layers,
  Power, // Stock Toggle Icon
} from "lucide-react";
import { BASE_URL } from "../config";

const AdminDashboard = () => {
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // --- UI STATES ---
  const [showItemModal, setShowItemModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showDummyModal, setShowDummyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- DATA STATES ---
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0 });
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [coupons, setCoupons] = useState([]);

  // 🎟️ Coupon Edit State
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editCouponId, setEditCouponId] = useState(null);

  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [editingShop, setEditingShop] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState({});

  // --- FORMS ---
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    isVeg: "true",
    orderIndex: 0,
    variants: [],
    addons: [],
  });

  const [newShop, setNewShop] = useState({
    name: "",
    email: "",
    password: "",
    image: "",
  });

  const [dummyShopData, setDummyShopData] = useState({ name: "", image: "" });

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercentage: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    expirationDate: "",
  });

  // 👇 COMMON FETCH OPTIONS (Token + Cookie Support) - 401 Fix Here
  const getFetchOptions = (method = "GET", body = null) => {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo?.token}`,
      },
      credentials: "include", // 👈 Critical for Cookie Auth
    };
    if (body) options.body = JSON.stringify(body);
    return options;
  };

  // --- 1. FETCH ALL DATA ---
  const fetchAllData = async () => {
    if (!userInfo || !userInfo.token) return;

    try {
      const resRest = await fetch(
        `${BASE_URL}/api/v1/users/admin/all`,
        getFetchOptions()
      );
      if (resRest.ok) {
        const dataRest = await resRest.json();
        setRestaurants(dataRest);
        setStats((prev) => ({ ...prev, users: dataRest.length }));
      }

      const resOrders = await fetch(
        `${BASE_URL}/api/v1/orders/admin/all`,
        getFetchOptions()
      );
      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
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
        getFetchOptions()
      );
      if (resPartners.ok) {
        const dataPartners = await resPartners.json();
        setDeliveryPartners(dataPartners);
      }

      try {
        const resCoupons = await axios.get(`${BASE_URL}/api/v1/coupons`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
          withCredentials: true, // Axios equivalent of credentials: include
        });
        setCoupons(resCoupons.data || []);
      } catch (couponError) {
        console.warn("Coupon API not ready yet:", couponError);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (userInfo && (userInfo.isAdmin || userInfo.role === "admin")) {
      fetchAllData();
    } else {
      navigate("/");
    }
  }, [userInfo, activeTab, navigate]);

  useEffect(() => {
    if (selectedRestaurant) {
      const fetchMenu = async () => {
        try {
          const res = await fetch(
            `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`,
            getFetchOptions()
          );
          const data = await res.json();
          setMenuItems(data);
        } catch (error) {
          console.error(error);
        }
      };
      fetchMenu();
    } else {
      setMenuItems([]);
    }
  }, [selectedRestaurant]);

  // ⚡ ADMIN STOCK TOGGLE (Fixed 401 Error)
  const handleAdminToggleStock = async (id) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/products/${id}/toggle-stock`,
        getFetchOptions("PATCH") // 👈 Uses Credentials
      );

      if (res.ok) {
        const updatedProduct = await res.json();
        // Update local state immediately
        setMenuItems((prevItems) =>
          prevItems.map((item) =>
            item._id === id
              ? { ...item, countInStock: updatedProduct.countInStock }
              : item
          )
        );
        toast.success(
          `Item marked as ${
            updatedProduct.countInStock > 0 ? "Available 🟢" : "Out of Stock 🔴"
          }`
        );
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to toggle stock");
      }
    } catch (error) {
      console.error("Toggle Failed", error);
      toast.error("Failed to update stock status");
    }
  };

  // --- VARIANT & ADDON HANDLERS ---
  const handleAddVariant = () => {
    setNewItem({
      ...newItem,
      variants: [...newItem.variants, { name: "", price: "" }],
    });
  };
  const handleRemoveVariant = (index) => {
    const updated = newItem.variants.filter((_, i) => i !== index);
    setNewItem({ ...newItem, variants: updated });
  };
  const handleVariantChange = (index, field, value) => {
    const updated = [...newItem.variants];
    updated[index][field] = value;
    setNewItem({ ...newItem, variants: updated });
  };
  const handleAddAddon = () => {
    setNewItem({
      ...newItem,
      addons: [...newItem.addons, { name: "", price: "" }],
    });
  };
  const handleRemoveAddon = (index) => {
    const updated = newItem.addons.filter((_, i) => i !== index);
    setNewItem({ ...newItem, addons: updated });
  };
  const handleAddonChange = (index, field, value) => {
    const updated = [...newItem.addons];
    updated[index][field] = value;
    setNewItem({ ...newItem, addons: updated });
  };

  // --- COUPON HANDLERS ---
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInfo.token}`,
      },
      withCredentials: true,
    };

    try {
      if (isEditingCoupon) {
        await axios.put(
          `${BASE_URL}/api/v1/coupons/${editCouponId}`,
          newCoupon,
          config
        );
        toast.success("Coupon Updated Successfully!");
      } else {
        await axios.post(`${BASE_URL}/api/v1/coupons`, newCoupon, config);
        toast.success("Coupon Created Successfully!");
      }

      setNewCoupon({
        code: "",
        discountPercentage: "",
        minOrderValue: "",
        maxDiscountAmount: "",
        expirationDate: "",
      });
      setIsEditingCoupon(false);
      setEditCouponId(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation Failed");
    }
  };

  const handleEditCouponClick = (coupon) => {
    setIsEditingCoupon(true);
    setEditCouponId(coupon._id);
    const formattedDate = new Date(coupon.expirationDate)
      .toISOString()
      .split("T")[0];
    setNewCoupon({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      expirationDate: formattedDate,
    });
    window.scrollTo(0, 0);
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
        withCredentials: true,
      };
      await axios.delete(`${BASE_URL}/api/v1/coupons/${id}`, config);
      toast.success("Coupon Deleted");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const cancelCouponEdit = () => {
    setIsEditingCoupon(false);
    setEditCouponId(null);
    setNewCoupon({
      code: "",
      discountPercentage: "",
      minOrderValue: "",
      maxDiscountAmount: "",
      expirationDate: "",
    });
  };

  const toggleCouponStatus = async (coupon) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
        withCredentials: true,
      };
      await axios.put(
        `${BASE_URL}/api/v1/coupons/${coupon._id}`,
        { isActive: !coupon.isActive },
        config
      );
      toast.success(`Coupon ${!coupon.isActive ? "Activated" : "Deactivated"}`);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // --- OTHER HANDLERS ---
  const handleShopReorder = async (index, direction) => {
    const newShops = [...restaurants];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newShops.length) return;
    const temp = newShops[index];
    newShops[index] = newShops[targetIndex];
    newShops[targetIndex] = temp;
    setRestaurants(newShops);
    try {
      await Promise.all([
        fetch(
          `${BASE_URL}/api/v1/users/${newShops[index]._id}`,
          getFetchOptions("PUT", { orderIndex: index })
        ),
        fetch(
          `${BASE_URL}/api/v1/users/${newShops[targetIndex]._id}`,
          getFetchOptions("PUT", { orderIndex: targetIndex })
        ),
      ]);
      setTimeout(() => fetchAllData(), 500);
    } catch (error) {
      console.error(error);
      fetchAllData();
    }
  };

  const handleMenuReorder = async (index, direction) => {
    const newItems = [...menuItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMenuItems(newItems);
    try {
      await fetch(
        `${BASE_URL}/api/v1/products/${newItems[index]._id}`,
        getFetchOptions("PUT", { orderIndex: index })
      );
      await fetch(
        `${BASE_URL}/api/v1/products/${newItems[targetIndex]._id}`,
        getFetchOptions("PUT", { orderIndex: targetIndex })
      );
      setTimeout(() => fetchAllData(), 300);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm("Delete this restaurant AND all items?")) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/users/${id}`,
        getFetchOptions("DELETE")
      );
      if (res.ok) {
        toast.success("Restaurant Removed");
        fetchAllData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete item?")) return;
    try {
      await fetch(
        `${BASE_URL}/api/v1/products/${id}`,
        getFetchOptions("DELETE")
      );
      fetchAllData(); // Or refetch just the menu
      // Re-fetch menu specific to selection
      if (selectedRestaurant) {
        const res = await fetch(
          `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`,
          getFetchOptions()
        );
        setMenuItems(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
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
      const res = await fetch(url, getFetchOptions(method, productData));
      if (res.ok) {
        setShowItemModal(false);
        // Refresh menu
        const menuRes = await fetch(
          `${BASE_URL}/api/v1/products/restaurant/${selectedRestaurant}`,
          getFetchOptions()
        );
        setMenuItems(await menuRes.json());
        toast.success("Success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    try {
      await fetch(
        `${BASE_URL}/api/v1/users/${editingShop._id}`,
        getFetchOptions("PUT", {
          name: editingShop.name,
          image: editingShop.image,
        })
      );
      setShowShopModal(false);
      fetchAllData();
      toast.success("Updated");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignPartner = async (orderId) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) return toast.error("Select partner");
    await fetch(
      `${BASE_URL}/api/v1/orders/${orderId}/assign`,
      getFetchOptions("PUT", { deliveryPartnerId: partnerId })
    );
    toast.success("Assigned");
    fetchAllData();
  };

  const handleCreateDummyShop = async (e) => {
    e.preventDefault();
    await fetch(
      `${BASE_URL}/api/v1/users/admin/create-dummy`,
      getFetchOptions("POST", dummyShopData)
    );
    setShowDummyModal(false);
    fetchAllData();
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    await fetch(
      `${BASE_URL}/api/v1/users/admin/create-shop`,
      getFetchOptions("POST", newShop)
    );
    setShowAddShopModal(false);
    fetchAllData();
  };

  const openEditItemModal = (item) => {
    setIsEditingItem(true);
    setEditItemId(item._id);
    setNewItem({
      ...item,
      isVeg: item.isVeg ? "true" : "false",
      variants: item.variants || [],
      addons: item.addons || [],
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
      variants: [],
      addons: [],
    });
    setShowItemModal(true);
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

        <div className="flex flex-wrap gap-4 mb-10 border-b border-gray-800 pb-4">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "orders", label: "Manage Orders", icon: ShoppingBag },
            { id: "shops", label: "Manage Shops", icon: Store },
            { id: "menu", label: "Manage Menu", icon: UtensilsCrossed },
            { id: "coupons", label: "Coupons", icon: Tag },
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

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
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

        {/* 🎟️ COUPONS TAB */}
        {activeTab === "coupons" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit sticky top-24">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                {isEditingCoupon ? (
                  <RefreshCw size={20} className="text-blue-500" />
                ) : (
                  <Plus size={20} className="text-green-500" />
                )}
                {isEditingCoupon ? "Update Coupon" : "Create New Coupon"}
              </h3>
              <form onSubmit={handleCouponSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Code</label>
                  <input
                    type="text"
                    placeholder="Ex: SWAD50"
                    className="w-full bg-black p-3 rounded border border-gray-700 uppercase font-bold text-white"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Discount %</label>
                    <input
                      type="number"
                      className="w-full bg-black p-3 rounded border border-gray-700 text-white"
                      value={newCoupon.discountPercentage}
                      onChange={(e) =>
                        setNewCoupon({
                          ...newCoupon,
                          discountPercentage: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Max Off (₹)</label>
                    <input
                      type="number"
                      className="w-full bg-black p-3 rounded border border-gray-700 text-white"
                      value={newCoupon.maxDiscountAmount}
                      onChange={(e) =>
                        setNewCoupon({
                          ...newCoupon,
                          maxDiscountAmount: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Min Order (₹)</label>
                  <input
                    type="number"
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white"
                    value={newCoupon.minOrderValue}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        minOrderValue: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Expires On</label>
                  <input
                    type="date"
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white"
                    value={newCoupon.expirationDate}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        expirationDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 ${
                      isEditingCoupon
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    } py-3 rounded font-bold transition text-white`}
                  >
                    {isEditingCoupon ? "Update" : "Create"}
                  </button>
                  {isEditingCoupon && (
                    <button
                      type="button"
                      onClick={cancelCouponEdit}
                      className="bg-gray-700 hover:bg-gray-600 px-4 rounded font-bold text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold mb-4">
                Active Coupons ({coupons.length})
              </h3>
              {coupons.length === 0 ? (
                <p className="text-gray-500">No active coupons found.</p>
              ) : (
                coupons.map((coupon) => (
                  <div
                    key={coupon._id}
                    className={`bg-gray-800 p-4 rounded-xl flex justify-between items-center border ${
                      editCouponId === coupon._id
                        ? "border-blue-500 bg-blue-900/10"
                        : "border-gray-700"
                    }`}
                  >
                    <div>
                      <h4 className="text-2xl font-black text-green-400">
                        {coupon.code}
                      </h4>
                      <p className="text-sm text-gray-300">
                        {coupon.discountPercentage}% OFF upto ₹
                        {coupon.maxDiscountAmount}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Min: ₹{coupon.minOrderValue} | Exp:{" "}
                        {new Date(coupon.expirationDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCouponStatus(coupon)}
                        className={`transition-colors duration-200 ${
                          coupon.isActive
                            ? "text-green-500 hover:text-green-400"
                            : "text-gray-500 hover:text-gray-400"
                        }`}
                        title={coupon.isActive ? "Deactivate" : "Activate"}
                      >
                        {coupon.isActive ? (
                          <ToggleRight size={32} />
                        ) : (
                          <ToggleLeft size={32} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditCouponClick(coupon)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                        title="Edit Coupon"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon._id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        title="Delete Coupon"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ORDERS TABLE */}
        {activeTab === "orders" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-400">
                <thead className="bg-black text-gray-200 uppercase font-bold text-sm">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Customer Details</th>
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
                      <td className="p-4">
                        <div className="font-bold text-white">
                          {o.shippingAddress?.fullName || o.user?.name}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold italic">
                          {o.shippingAddress?.city}, {o.shippingAddress?.state}
                        </div>
                        <div className="text-primary font-mono text-xs font-extrabold mt-0.5 flex items-center gap-1">
                          <Phone size={10} /> {o.shippingAddress?.phone}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-white">
                        ₹{o.totalPrice}
                      </td>
                      <td className="p-4">{getStatusBadge(o)}</td>
                      <td className="p-4">
                        {o.deliveryPartner ? (
                          <span className="text-blue-400 font-bold">
                            {o.deliveryPartner.name}
                          </span>
                        ) : (
                          <select
                            className="bg-black border border-gray-700 text-white p-1 rounded text-xs"
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
                          className="p-2 bg-gray-700 rounded-lg"
                        >
                          <Eye size={16} />
                        </button>
                        {!o.deliveryPartner && !o.isDelivered && (
                          <button
                            onClick={() => handleAssignPartner(o._id)}
                            className="bg-primary px-3 py-1 rounded text-xs font-bold"
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

        {/* SHOPS TAB */}
        {activeTab === "shops" && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Store className="text-primary" /> Manage Restaurants
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDummyModal(true)}
                  className="bg-yellow-600 font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-all active:scale-95"
                >
                  <PlusCircle size={20} /> Dummy
                </button>
                <button
                  onClick={() => setShowAddShopModal(true)}
                  className="bg-primary font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus size={20} /> Register
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((shop, index) => (
                <div
                  key={shop._id}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative hover:border-primary/50 transition-all shadow-xl"
                >
                  <div className="h-48 relative">
                    <img
                      src={
                        shop.image ||
                        "https://images.unsplash.com/photo-1552566626-52f8b828add9"
                      }
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <button
                        onClick={() => handleShopReorder(index, -1)}
                        disabled={index === 0}
                        className="bg-black/60 hover:bg-primary p-1.5 rounded text-white disabled:opacity-20 transition-all active:scale-90"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        onClick={() => handleShopReorder(index, 1)}
                        disabled={index === restaurants.length - 1}
                        className="bg-black/60 hover:bg-primary p-1.5 rounded text-white disabled:opacity-20 transition-all active:scale-90"
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                      <button
                        onClick={() => {
                          setEditingShop(shop);
                          setShowShopModal(true);
                        }}
                        className="bg-white text-black font-bold py-2 px-4 rounded-full flex items-center gap-2 shadow-lg active:scale-95"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRestaurant(shop._id)}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 shadow-lg active:scale-95"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-xl font-bold text-white">
                        {shop.name}
                      </h3>
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                        POS: {shop.orderIndex || index}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm italic">{shop.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === "menu" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <UtensilsCrossed className="text-primary" /> Master Stock Tracker
            </h2>
            <div className="flex gap-4 mb-8">
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full md:w-1/2 bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-primary focus:outline-none transition-all"
              >
                <option value="">-- Select Restaurant --</option>
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {selectedRestaurant && (
                <button
                  onClick={openAddItemModal}
                  className="bg-primary font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Plus size={20} /> Add Item
                </button>
              )}
            </div>

            {selectedRestaurant ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                      {/* ⚡ NEW: ADMIN STOCK TOGGLE BUTTON */}
                      <button
                        onClick={() => handleAdminToggleStock(item._id)}
                        className={`absolute bottom-2 left-2 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black transition-all shadow-xl border z-20 cursor-pointer ${
                          item.countInStock > 0
                            ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/40"
                            : "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40"
                        }`}
                      >
                        <Power size={12} />{" "}
                        {item.countInStock > 0 ? "AVAILABLE" : "SOLD OUT"}
                      </button>

                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button
                          onClick={() => handleMenuReorder(index, -1)}
                          disabled={index === 0}
                          className="bg-black/60 hover:bg-primary p-1 rounded text-white disabled:opacity-30 active:scale-90 transition-all"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMenuReorder(index, 1)}
                          disabled={index === menuItems.length - 1}
                          className="bg-black/60 hover:bg-primary p-1 rounded text-white disabled:opacity-30 active:scale-90 transition-all"
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
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="flex-1 bg-gray-800 hover:bg-blue-600 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id)}
                          className="flex-1 bg-gray-800 hover:bg-red-600 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-black/20 rounded-xl border border-dashed border-gray-800 text-gray-500 font-bold italic">
                Select a restaurant above to manage its inventory and stock
                status.
              </div>
            )}
          </div>
        )}

        {/* MODALS (Item, Shop, etc.) */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                Order #{selectedOrder._id.substring(0, 8)}{" "}
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
              <p className="text-gray-500 text-[10px] mb-6 flex items-center gap-1 uppercase tracking-widest font-bold italic">
                <Calendar size={10} /> Placed on:{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <h3 className="text-gray-500 text-[10px] font-bold uppercase mb-2 flex items-center gap-2 tracking-widest">
                    <User size={12} className="text-primary" /> Customer
                  </h3>
                  <p className="font-bold text-white">
                    {selectedOrder.shippingAddress?.fullName ||
                      selectedOrder.user?.name}
                  </p>
                  <p className="text-primary font-mono font-bold mt-2 text-sm bg-primary/10 w-fit px-2 py-1 rounded border border-primary/20 flex items-center gap-2">
                    <Phone size={12} />{" "}
                    {selectedOrder.shippingAddress?.phone || "No Phone"}
                  </p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <h3 className="text-gray-500 text-[10px] font-bold uppercase mb-2 flex items-center gap-2 tracking-widest">
                    <MapPin size={12} className="text-primary" /> Address
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {selectedOrder.shippingAddress?.address},{" "}
                    {selectedOrder.shippingAddress?.city}, <br />{" "}
                    {selectedOrder.shippingAddress?.state} -{" "}
                    {selectedOrder.shippingAddress?.postalCode}
                  </p>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase mb-3 flex items-center gap-2 tracking-widest">
                  <ShoppingBag size={12} className="text-primary" /> Order Items
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-3 scrollbar-hide pr-2">
                  {selectedOrder.orderItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-white leading-none">
                            {item.name}
                          </p>
                          <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                            {item.selectedVariant && (
                              <span className="block text-blue-300">
                                • Size: {item.selectedVariant.name}
                              </span>
                            )}
                            {item.selectedAddons &&
                              item.selectedAddons.length > 0 && (
                                <span className="block text-green-300">
                                  • Extras:{" "}
                                  {item.selectedAddons
                                    .map((a) => a.name)
                                    .join(", ")}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white italic">
                        ₹{item.price * item.qty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showItemModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                {/* FORM FIELDS SAME AS BEFORE */}
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
                    <option value="true">Veg</option>
                    <option value="false">Non-Veg</option>
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
                />

                {/* VARIANTS */}
                <div className="bg-black/20 p-3 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Layers size={12} /> Variants
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs text-primary font-bold flex items-center gap-1 hover:text-white"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {newItem.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-2/3 bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                        value={variant.name}
                        onChange={(e) =>
                          handleVariantChange(index, "name", e.target.value)
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        className="w-1/4 bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                        value={variant.price}
                        onChange={(e) =>
                          handleVariantChange(index, "price", e.target.value)
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ADDONS */}
                <div className="bg-black/20 p-3 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <PlusCircle size={12} /> Add-ons
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAddon}
                      className="text-xs text-green-500 font-bold flex items-center gap-1 hover:text-white"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {newItem.addons.map((addon, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-2/3 bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                        value={addon.name}
                        onChange={(e) =>
                          handleAddonChange(index, "name", e.target.value)
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        className="w-1/4 bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white"
                        value={addon.price}
                        onChange={(e) =>
                          handleAddonChange(index, "price", e.target.value)
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  {isEditingItem ? "Update" : "Add"}
                </button>
              </form>
            </div>
          </div>
        )}

        {showAddShopModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md relative border border-gray-700">
              <button
                onClick={() => setShowAddShopModal(false)}
                className="absolute top-4 right-4 text-gray-400"
              >
                <X />
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
                  className="w-full bg-green-600 font-bold py-3 rounded-xl"
                >
                  Register
                </button>
              </form>
            </div>
          </div>
        )}

        {showDummyModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md relative border border-gray-700">
              <button
                onClick={() => setShowDummyModal(false)}
                className="absolute top-4 right-4 text-gray-400"
              >
                <X />
              </button>
              <h2 className="text-2xl font-bold mb-4">Add Dummy Shop</h2>
              <form onSubmit={handleCreateDummyShop} className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={dummyShopData.name}
                  onChange={(e) =>
                    setDummyShopData({
                      ...dummyShopData,
                      name: e.target.value,
                    })
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
                  className="w-full bg-yellow-600 font-bold py-3 rounded-xl"
                >
                  Create
                </button>
              </form>
            </div>
          </div>
        )}

        {showShopModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md relative border border-gray-700">
              <button
                onClick={() => setShowShopModal(false)}
                className="absolute top-4 right-4 text-gray-400"
              >
                <X />
              </button>
              <h2 className="text-2xl font-bold mb-4">Edit Shop</h2>
              <form onSubmit={handleUpdateShop} className="space-y-4">
                <input
                  type="text"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={editingShop?.name || ""}
                  onChange={(e) =>
                    setEditingShop({ ...editingShop, name: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  className="w-full bg-gray-800 border-gray-700 p-3 rounded text-white"
                  value={editingShop?.image || ""}
                  onChange={(e) =>
                    setEditingShop({ ...editingShop, image: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 font-bold py-3 rounded-xl"
                >
                  Update
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
