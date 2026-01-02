import React, { useState } from "react";
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
import { BASE_URL } from "../../config";

const ShopsTab = ({ restaurants, userInfo, fetchAllData }) => {
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showDummyModal, setShowDummyModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newShop, setNewShop] = useState({
    name: "",
    email: "",
    password: "",
    image: "",
  });
  const [dummyShopData, setDummyShopData] = useState({ name: "", image: "" });

  const getFetchOptions = (method = "GET", body = null) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInfo?.token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  // --- Actions ---
  const handleApprove = async (id) => {
    try {
      setIsProcessing(true);
      const res = await fetch(
        `${BASE_URL}/api/v1/restaurants/${id}/approve`,
        getFetchOptions("PUT")
      );
      if (res.ok) {
        toast.success("Merchant Verified: Shop is now LIVE! 🚀");
        fetchAllData();
      }
    } catch (err) {
      toast.error("Handshake failed with server");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (
      !window.confirm(
        "CRITICAL: Delete merchant and all associated menu items?"
      )
    )
      return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/users/${id}`,
        getFetchOptions("DELETE")
      );
      if (res.ok) {
        toast.success("Merchant decommissioned successfully");
        fetchAllData();
      }
    } catch (error) {
      toast.error("Destruction sequence failed");
    }
  };

  const handleAddShop = async (e) => {
    e.preventDefault();
    const res = await fetch(
      `${BASE_URL}/api/v1/users/admin/create-shop`,
      getFetchOptions("POST", newShop)
    );
    if (res.ok) {
      setShowAddShopModal(false);
      setNewShop({ name: "", email: "", password: "", image: "" });
      fetchAllData();
      toast.success("Identity Created: Merchant onboarded!");
    }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    const res = await fetch(
      `${BASE_URL}/api/v1/users/${editingShop._id}`,
      getFetchOptions("PUT", {
        name: editingShop.name,
        image: editingShop.image,
      })
    );
    if (res.ok) {
      setShowShopModal(false);
      fetchAllData();
      toast.success("Merchant parameters updated");
    }
  };

  const handleCreateDummyShop = async (e) => {
    e.preventDefault();
    const res = await fetch(
      `${BASE_URL}/api/v1/users/admin/create-dummy`,
      getFetchOptions("POST", dummyShopData)
    );
    if (res.ok) {
      setShowDummyModal(false);
      setDummyShopData({ name: "", image: "" });
      fetchAllData();
      toast.success("Synthetic merchant deployed to production");
    }
  };

  const pendingShops = restaurants.filter((r) => !r.isVerified && !r.isDummy);
  const activeShops = restaurants.filter((r) => r.isVerified || r.isDummy);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 font-sans">
      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-8 bg-gray-900/40 p-10 rounded-[3rem] border border-gray-800 shadow-2xl backdrop-blur-md">
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 leading-none">
            <Store className="text-primary" size={40} /> Merchant{" "}
            <span className="text-primary">Registry</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 pl-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{" "}
            Marketplace Infrastructure Control
          </p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setShowDummyModal(true)}
            className="bg-orange-600/5 hover:bg-orange-600/10 text-orange-500 border border-orange-500/20 font-black py-4 px-8 rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-xl"
          >
            <PlusCircle size={18} /> Add Synthetic Data
          </button>
          <button
            onClick={() => setShowAddShopModal(true)}
            className="bg-primary hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20"
          >
            <Plus size={20} /> Deploy New Partner
          </button>
        </div>
      </div>

      {/* ⚠️ 1. PENDING APPROVALS */}
      {pendingShops.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xs font-black text-primary uppercase tracking-[0.5em] flex items-center gap-3 pl-4">
            <ShieldAlert size={20} /> High Priority: Pending Clearances (
            {pendingShops.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pendingShops.map((shop) => (
              <div
                key={shop._id}
                className="bg-gray-950 border-2 border-primary/20 p-8 rounded-[3rem] flex justify-between items-center shadow-2xl group hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-800 shadow-inner group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                    {shop.image ? (
                      <img
                        src={shop.image}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0"
                      />
                    ) : (
                      <ImageIcon className="text-gray-700" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-white uppercase italic text-2xl tracking-tighter leading-tight">
                      {shop.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">
                      {shop.owner?.name || "Unidentified Merchant"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleApprove(shop._id)}
                  disabled={isProcessing}
                  className="bg-primary hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-primary/10 flex items-center gap-2 active:scale-90 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Authorize"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ 2. ACTIVE MARKETPLACE */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.5em] flex items-center gap-3 pl-4">
          <CheckCircle size={20} /> Active Infrastructure Matrix (
          {activeShops.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeShops.map((shop) => (
            <div
              key={shop._id}
              className="bg-gray-950 border border-gray-900 rounded-[3.5rem] overflow-hidden group relative hover:border-primary/30 transition-all shadow-2xl flex flex-col"
            >
              <div className="h-56 relative overflow-hidden">
                <img
                  src={shop.image || "https://via.placeholder.com/300"}
                  alt={shop.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-40 group-hover:opacity-60 grayscale group-hover:grayscale-0"
                />
                <div className="absolute top-6 left-6 flex gap-3">
                  {shop.isDummy ? (
                    <span className="bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
                      Synthetic Asset
                    </span>
                  ) : (
                    <span className="bg-green-600/20 text-green-400 border border-green-600/30 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md flex items-center gap-2">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                {/* Cyber Actions */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all gap-4 backdrop-blur-md">
                  <button
                    onClick={() => {
                      setEditingShop(shop);
                      setShowShopModal(true);
                    }}
                    className="bg-white text-black font-black p-4 rounded-2xl hover:bg-primary hover:text-white transition-all transform hover:rotate-6 active:scale-90"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteRestaurant(shop._id)}
                    className="bg-red-600 text-white font-black p-4 rounded-2xl hover:bg-red-700 transition-all transform hover:-rotate-6 active:scale-90"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 space-y-2 border-t border-gray-900">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter group-hover:text-primary transition-colors leading-none">
                  {shop.name}
                </h3>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest truncate">
                    {shop.owner?.email || "System Placeholder"}
                  </p>
                  <div className="text-[9px] font-black text-gray-700 uppercase tracking-tighter border-l border-gray-800 pl-3">
                    ID:{shop._id.slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          MODALS ENGINE
      ========================================== */}
      {[
        {
          show: showAddShopModal,
          close: setShowAddShopModal,
          title: "Initialize Partnership",
          form: (
            <form onSubmit={handleAddShop} className="space-y-5">
              <input
                type="text"
                placeholder="Establishment Name"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newShop.name}
                onChange={(e) =>
                  setNewShop({ ...newShop, name: e.target.value })
                }
                required
              />
              <input
                type="email"
                placeholder="Login Email"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newShop.email}
                onChange={(e) =>
                  setNewShop({ ...newShop, email: e.target.value })
                }
                required
              />
              <input
                type="password"
                placeholder="Secure Password"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newShop.password}
                onChange={(e) =>
                  setNewShop({ ...newShop, password: e.target.value })
                }
                required
              />
              <button
                type="submit"
                className="w-full bg-primary font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95"
              >
                Initiate Onboarding
              </button>
            </form>
          ),
        },
        {
          show: showShopModal,
          close: setShowShopModal,
          title: "Modify Identity",
          form: (
            <form onSubmit={handleUpdateShop} className="space-y-5">
              <input
                type="text"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={editingShop?.name || ""}
                onChange={(e) =>
                  setEditingShop({ ...editingShop, name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Visual Asset URL"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={editingShop?.image || ""}
                onChange={(e) =>
                  setEditingShop({ ...editingShop, image: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-green-600 font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.3em] active:scale-95"
              >
                Save Modifications
              </button>
            </form>
          ),
        },
        {
          show: showDummyModal,
          close: setShowDummyModal,
          title: "Create Synthetic Node",
          form: (
            <form onSubmit={handleCreateDummyShop} className="space-y-5">
              <input
                type="text"
                placeholder="Synthetic Shop Name"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={dummyShopData.name}
                onChange={(e) =>
                  setDummyShopData({ ...dummyShopData, name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Visual Placeholder URL"
                className="w-full bg-black border border-gray-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={dummyShopData.image}
                onChange={(e) =>
                  setDummyShopData({ ...dummyShopData, image: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-orange-600 font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.3em] active:scale-95"
              >
                Push to Production
              </button>
            </form>
          ),
        },
      ].map(
        (modal, i) =>
          modal.show && (
            <div
              key={i}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex justify-center items-center z-[9999] p-6 animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="bg-gray-950 p-12 rounded-[4rem] w-full max-w-lg relative border border-gray-900 shadow-[0_0_100px_rgba(225,29,72,0.1)]">
                <button
                  onClick={() => modal.close(false)}
                  className="absolute top-10 right-10 text-gray-700 hover:text-white transition-all bg-gray-900 p-3 rounded-full"
                >
                  <X size={24} />
                </button>
                <h2 className="text-3xl font-black italic uppercase text-white mb-10 tracking-tighter border-l-8 border-primary pl-6 leading-none">
                  {modal.title}
                </h2>
                {modal.form}
              </div>
            </div>
          )
      )}
    </div>
  );
};

export default ShopsTab;
