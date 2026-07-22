import React, { useState, useEffect } from "react";
import {
 Store,
 Plus,
 PlusCircle,
 Edit2,
 Trash2,
 X,
 ShieldCheck,
 ShieldAlert,
 CheckCircle,
 Loader2,
 Image as ImageIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { BASEURL } from "../../config";
import { getSocket } from "../../utils/socket";
import { optimizeImageUrl } from "../../utils/imageOptimizer";

const ShopsTab = ({ restaurants, fetchAllData }) => {
 const [loading, setLoading] = useState(true);
 const [showAddShopModal, setShowAddShopModal] = useState(false);
 const [showShopModal, setShowShopModal] = useState(false);
 const [showDummyModal, setShowDummyModal] = useState(false);
 const [editingShop, setEditingShop] = useState(null);
  const [processingId, setProcessingId] = useState(null);

 useEffect(() => {
 if (restaurants) setLoading(false);
 }, [restaurants]);

 // Form States
 const [newShop, setNewShop] = useState({
 name: "",
 email: "",
 password: "",
 image: "",
 });
 const [dummyShopData, setDummyShopData] = useState({ name: "", image: "" });

 const PLACEHOLDER_IMG =
 "https://placehold.co/600x400/1f2937/white?text=No+Image";

 // --- 🔌 Socket Listener ---
 useEffect(() => {
 const socket = getSocket();
 const handleShopStatusUpdate = () => {
 if (fetchAllData) fetchAllData();
 };
 socket.on("shopStatusUpdated", handleShopStatusUpdate);

 return () => {
 socket.off("shopStatusUpdated", handleShopStatusUpdate);
 };
 }, [fetchAllData]);

 // --- 🛠️ Helper for API Calls ---
 const getFetchOptions = (method = "GET", body = null) => ({
 method,
 credentials: "include",
 headers: {
 "Content-Type": "application/json",
 },
 body: body ? JSON.stringify(body) : null,
 });

 // --- 🚀 Actions ---

  // 1. Approve Restaurant
  const handleApprove = async (id) => {
  try {
  setProcessingId(id);
 const res = await fetch(
 `${BASEURL}/api/v1/restaurants/${id}/approve`,
 getFetchOptions("PUT"),
 );
 const data = await res.json().catch(() => ({}));

 if (res.ok) {
 toast.success("Merchant Verified: Shop is now LIVE! 🚀");
 if (fetchAllData) fetchAllData();
 } else {
 toast.error(data.message || "Approval failed.");
 }
  } catch (err) {
  console.error(err);
  toast.error("Handshake failed with server");
  } finally {
  setProcessingId(null);
  }
  };

 // 2. Delete Restaurant (FIXED URL ✅)
 const handleDeleteRestaurant = async (id) => {
 if (
 !window.confirm(
 "CRITICAL: Delete merchant and all associated menu items?",
 )
 )
 return;
 try {
 // ✅ Corrected: Hits the Restaurant route, not User route
 const res = await fetch(
 `${BASEURL}/api/v1/restaurants/${id}`,
 getFetchOptions("DELETE"),
 );
 if (res.ok) {
 toast.success("Merchant decommissioned successfully");
 if (fetchAllData) fetchAllData();
 } else {
 const err = await res.json().catch(() => ({}));
 toast.error(err.message || "Delete failed");
 }
 } catch {
 toast.error("Destruction sequence failed");
 }
 };

 // 3. Add New Real Shop
 const handleAddShop = async (e) => {
 e.preventDefault();
 try {
 const payload = { ...newShop, image: optimizeImageUrl(newShop.image) };
 const res = await fetch(
 `${BASEURL}/api/v1/users/admin/create-shop`,
 getFetchOptions("POST", payload),
 );
 if (res.ok) {
 setShowAddShopModal(false);
 setNewShop({ name: "", email: "", password: "", image: "" });
 if (fetchAllData) fetchAllData();
 toast.success("Identity Created: Merchant onboarded!");
 } else {
 const err = await res.json().catch(() => ({}));
 toast.error(err.message || "Failed to create shop");
 }
 } catch {
 toast.error("Network error");
 }
 };

 // 4. Update Shop Details (FIXED URL ✅)
 const handleUpdateShop = async (e) => {
 e.preventDefault();
 try {
 // ✅ Corrected: Hits the Restaurant route, not User route
 const res = await fetch(
 `${BASEURL}/api/v1/restaurants/${editingShop._id}`,
 getFetchOptions("PUT", {
 name: editingShop.name,
 image: optimizeImageUrl(editingShop.image),
 }),
 );

 if (res.ok) {
 setShowShopModal(false);
 if (fetchAllData) fetchAllData();
 toast.success("Merchant parameters updated! ✨");
 } else {
 const errData = await res.json().catch(() => ({}));
 toast.error(errData.message || "Update sequence failed");
 }
 } catch {
 toast.error("Update failed: Server unreachable");
 }
 };

 // 5. Add Dummy Shop
 const handleCreateDummyShop = async (e) => {
 e.preventDefault();
 try {
 const payload = {
 ...dummyShopData,
 image: optimizeImageUrl(dummyShopData.image),
 };
 const res = await fetch(
 `${BASEURL}/api/v1/users/admin/create-dummy`,
 getFetchOptions("POST", payload),
 );
 if (res.ok) {
 setShowDummyModal(false);
 setDummyShopData({ name: "", image: "" });
 if (fetchAllData) fetchAllData();
 toast.success("Synthetic merchant deployed to production");
 } else {
 toast.error("Failed to create dummy");
 }
 } catch {
 toast.error("Failed to create dummy");
 }
 };

 // --- 🔍 Filtering Logic (FIXED) ---
 // Note: Restaurants collection usually doesn't have 'role', so we use the array directly
 const pendingShops = restaurants.filter(
 (r) => !r.isVerified && !r.isDummy && r.isActive,
 );

 // Active shops includes verified OR dummy shops
 const activeShops = restaurants.filter((r) => r.isVerified || r.isDummy);

 const handleImageError = (e) => {
 e.target.src = PLACEHOLDER_IMG;
 };

  if (loading) {
  return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
  {Array.from({ length: 3 }).map((_, i) => (
  <div key={i} className="bg-gray-950 border border-gray-900 rounded-2xl md:rounded-[2.5rem] overflow-hidden">
  <div className="h-40 sm:h-48 md:h-56 bg-gray-900" />
  <div className="p-4 md:p-6 space-y-3">
  <div className="h-5 md:h-6 bg-gray-900 rounded w-3/4" />
  <div className="h-3 md:h-4 bg-gray-900 rounded w-1/2" />
  <div className="flex gap-2 pt-2">
  <div className="flex-1 h-8 md:h-10 bg-gray-900 rounded-xl" />
  <div className="flex-1 h-8 md:h-10 bg-gray-900 rounded-xl" />
  </div>
  </div>
  </div>
  ))}
  </div>
  );
  }

 return (
 <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 font-sans">
  {/* --- HEADER --- */}
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-gray-900/40 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-gray-800 shadow-2xl backdrop-blur-md">
  <div className="min-w-0">
  <h2 className="text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-tighter flex items-center flex-wrap gap-1.5 sm:gap-3 leading-none">
  <Store className="text-primary shrink-0" size={20} /> <span>Merchant</span>{" "}
  <span className="text-primary">Registry</span>
  </h2>
  <div className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em] sm:tracking-[0.4em] mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
  <div className="w-0.5 h-0.5 sm:w-1 sm:h-1.5 rounded-full bg-primary animate-pulse"></div>
  <span className="truncate">Marketplace Infrastructure Control</span>
  </div>
  </div>
  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
  <button
  onClick={() => setShowDummyModal(true)}
  className="bg-orange-600/5 hover:bg-orange-600/10 text-orange-500 border border-orange-500/20 font-black py-3 sm:py-4 px-5 sm:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl"
  >
  <PlusCircle size={16} /> Add Synthetic Data
  </button>
  <button
  onClick={() => setShowAddShopModal(true)}
  className="bg-primary hover:bg-red-600 text-white font-black py-3 sm:py-4 px-5 sm:px-10 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20"
  >
  <Plus size={18} /> Deploy New Partner
  </button>
  </div>
  </div>

  {/* ⚠️ PENDING APPROVALS */}
  {pendingShops.length > 0 ? (
  <div className="space-y-4 md:space-y-6">
  <h3 className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.4em] md:tracking-[0.5em] flex items-center gap-2 md:gap-3 pl-2 md:pl-4">
  <ShieldAlert size={16} className="shrink-0" /> Pending Clearances (
  {pendingShops.length})
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
  {pendingShops.map((shop) => (
  <div
  key={shop._id}
  className="bg-gray-950 border-2 border-primary/20 p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-2xl group hover:border-primary/50 transition-all"
  >
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
  <div className="flex items-center gap-4 flex-1 min-w-0">
  <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-900 rounded-2xl md:rounded-[2rem] overflow-hidden border border-gray-800 shadow-inner shrink-0">
  <img
  src={shop.image || PLACEHOLDER_IMG}
  onError={handleImageError}
  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
  alt={shop.name}
  />
  </div>
  <div className="min-w-0 flex-1">
  <h4 className="font-black text-white uppercase text-sm md:text-xl lg:text-2xl tracking-tighter leading-tight truncate">
  {shop.name}
  </h4>
  <p className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">
  {shop.owner?.name || "Unidentified Merchant"}
  </p>
  </div>
  </div>
  <button
  onClick={() => handleApprove(shop._id)}
  disabled={processingId === shop._id}
  className="w-full sm:w-auto bg-primary hover:bg-red-600 text-white px-5 md:px-8 py-3 md:py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2 active:scale-90 disabled:opacity-50"
  >
  {processingId === shop._id ? (
  <Loader2 size={14} className="animate-spin" />
  ) : (
  "Authorize"
  )}
  </button>
  </div>
  </div>
  ))}
  </div>
  </div>
  ) : (
  <div className="bg-gray-950 border border-dashed border-gray-800 rounded-2xl p-8 text-center">
  <ShieldAlert size={24} className="mx-auto text-gray-800 mb-2" />
  <p className="text-gray-700 font-black uppercase text-[10px] tracking-[0.3em]">
  No pending clearances
  </p>
  </div>
  )}

  {/* ✅ ACTIVE MARKETPLACE */}
  {activeShops.length > 0 ? (
  <div className="space-y-4 md:space-y-6">
  <h3 className="text-[10px] md:text-xs font-black text-gray-600 uppercase tracking-[0.4em] md:tracking-[0.5em] flex items-center gap-2 md:gap-3 pl-2 md:pl-4">
  <CheckCircle size={16} className="shrink-0" /> Active Matrix (
  {activeShops.length})
  </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {activeShops.map((shop) => (
  <div
  key={shop._id}
  className="bg-gray-950 border border-gray-900 rounded-2xl md:rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all shadow-2xl flex flex-col"
  >
  <div className="relative">
  <div className="h-40 sm:h-48 md:h-56 overflow-hidden">
  <img
  src={shop.image || PLACEHOLDER_IMG}
  onError={handleImageError}
  alt={shop.name}
  className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
  />
  </div>
  {shop.isDummy ? (
  <span className="absolute top-3 left-3 md:top-4 md:left-4 bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">
  Synthetic
  </span>
  ) : (
  <span className="absolute top-3 left-3 md:top-4 md:left-4 bg-green-600/20 text-green-400 border border-green-600/30 text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md flex items-center gap-1.5">
  <ShieldCheck size={10} /> Verified
  </span>
  )}
  </div>
  <div className="p-4 md:p-6 space-y-3 border-t border-gray-900 flex-1 flex flex-col">
  <h3 className="text-base md:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter group-hover:text-primary transition-colors leading-none truncate">
  {shop.name}
  </h3>
  <p className="text-[9px] md:text-[10px] text-gray-600 font-bold uppercase tracking-widest truncate">
  {shop.owner?.email || "System Placeholder"}
  </p>
  <div className="flex items-center gap-2 pt-2 mt-auto border-t border-gray-900/50">
  <button
  onClick={() => {
  setEditingShop(shop);
  setShowShopModal(true);
  }}
  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 text-gray-400 hover:bg-primary hover:text-white py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
  >
  <Edit2 size={14} /> Edit
  </button>
  <button
  onClick={() => handleDeleteRestaurant(shop._id)}
  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/5 text-red-400 hover:bg-red-600 hover:text-white py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
  >
  <Trash2 size={14} /> Delete
  </button>
  </div>
  </div>
  </div>
  ))}
  </div>
  </div>
  ) : (
  <div className="bg-gray-950 border border-dashed border-gray-800 rounded-2xl p-8 text-center">
  <Store size={24} className="mx-auto text-gray-800 mb-2" />
  <p className="text-gray-700 font-black uppercase text-[10px] tracking-[0.3em]">
  No active shops
  </p>
  </div>
  )}

  {/* MODALS */}
  {showAddShopModal && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
  <div className="bg-gray-950 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] w-full max-w-sm sm:max-w-md md:max-w-lg relative border border-gray-900 shadow-[0_0_100px_rgba(225,29,72,0.1)] max-h-[90vh] overflow-y-auto">
  <button
  onClick={() => setShowAddShopModal(false)}
  className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 sm:p-3 rounded-full"
  >
  <X size={18} />
  </button>
  <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white mb-6 sm:mb-8 tracking-tighter border-l-6 sm:border-l-8 border-primary pl-4 md:pl-6 leading-none">
  Initialize Partnership
  </h2>
  <form onSubmit={handleAddShop} className="space-y-3 sm:space-y-4">
  <input
  type="text"
  placeholder="Establishment Name"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={newShop.name}
  onChange={(e) =>
  setNewShop({ ...newShop, name: e.target.value })
  }
  required
  />
  <input
  type="email"
  placeholder="Login Email"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={newShop.email}
  onChange={(e) =>
  setNewShop({ ...newShop, email: e.target.value })
  }
  required
  />
  <input
  type="password"
  placeholder="Secure Password"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={newShop.password}
  onChange={(e) =>
  setNewShop({ ...newShop, password: e.target.value })
  }
  required
  />
  <input
  type="text"
  placeholder="Shop Image URL (optional)"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={newShop.image}
  onChange={(e) =>
  setNewShop({ ...newShop, image: e.target.value })
  }
  />
  <button
  type="submit"
  className="w-full bg-primary font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95"
  >
  Initiate Onboarding
  </button>
  </form>
  </div>
  </div>
  )}

  {showShopModal && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
  <div className="bg-gray-950 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] w-full max-w-sm sm:max-w-md md:max-w-lg relative border border-gray-900 shadow-[0_0_100px_rgba(225,29,72,0.1)] max-h-[90vh] overflow-y-auto">
  <button
  onClick={() => setShowShopModal(false)}
  className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 sm:p-3 rounded-full"
  >
  <X size={18} />
  </button>
  <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white mb-6 sm:mb-8 tracking-tighter border-l-6 sm:border-l-8 border-primary pl-4 md:pl-6 leading-none">
  Modify Identity
  </h2>
  <form onSubmit={handleUpdateShop} className="space-y-3 sm:space-y-4">
  <input
  type="text"
  placeholder="Shop Name"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={editingShop?.name || ""}
  onChange={(e) =>
  setEditingShop({ ...editingShop, name: e.target.value })
  }
  required
  />
  <input
  type="text"
  placeholder="Visual Asset URL"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={editingShop?.image || ""}
  onChange={(e) =>
  setEditingShop({ ...editingShop, image: e.target.value })
  }
  />
  <button
  type="submit"
  className="w-full bg-green-600 font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] active:scale-95"
  >
  Save Modifications
  </button>
  </form>
  </div>
  </div>
  )}

  {showDummyModal && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
  <div className="bg-gray-950 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] w-full max-w-sm sm:max-w-md md:max-w-lg relative border border-gray-900 shadow-[0_0_100px_rgba(225,29,72,0.1)] max-h-[90vh] overflow-y-auto">
  <button
  onClick={() => setShowDummyModal(false)}
  className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 text-gray-700 hover:text-white transition-all bg-gray-900 p-2 sm:p-3 rounded-full"
  >
  <X size={18} />
  </button>
  <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white mb-6 sm:mb-8 tracking-tighter border-l-6 sm:border-l-8 border-primary pl-4 md:pl-6 leading-none">
  Create Synthetic Node
  </h2>
  <form onSubmit={handleCreateDummyShop} className="space-y-3 sm:space-y-4">
  <input
  type="text"
  placeholder="Synthetic Shop Name"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={dummyShopData.name}
  onChange={(e) =>
  setDummyShopData({ ...dummyShopData, name: e.target.value })
  }
  required
  />
  <input
  type="text"
  placeholder="Visual Placeholder URL"
  className="w-full bg-black border border-gray-800 p-3.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={dummyShopData.image}
  onChange={(e) =>
  setDummyShopData({ ...dummyShopData, image: e.target.value })
  }
  />
  <button
  type="submit"
  className="w-full bg-orange-600 font-black py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] active:scale-95"
  >
  Push to Production
  </button>
  </form>
  </div>
  </div>
  )}
 </div>
 );
};

export default ShopsTab;
