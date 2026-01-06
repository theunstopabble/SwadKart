import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  Users,
  Ticket,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { BASE_URL } from "../../config";

const CouponsTab = ({ userInfo }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editCouponId, setEditCouponId] = useState(null);

  // ✅ Fixed: State names now match Backend Schema perfectly
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountPercentage: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    expirationDate: "",
  });

  const fetchCoupons = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/v1/coupons`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setCoupons(data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCouponSubmit = async (e) => {
    e.preventDefault();

    if (
      !newCoupon.code ||
      !newCoupon.discountPercentage ||
      !newCoupon.expirationDate
    ) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      // 🎯 CRITICAL FIX: Payload keys match Backend Schema EXACTLY
      // Backend expects: discountPercentage, minOrderValue, maxDiscountAmount
      const payload = {
        code: newCoupon.code.toUpperCase(),
        discountPercentage: Number(newCoupon.discountPercentage), // Was sending 'discount'
        minOrderValue: Number(newCoupon.minOrderValue) || 0, // Was sending 'minOrderAmount'
        maxDiscountAmount: Number(newCoupon.maxDiscountAmount) || 0, // Was sending 'maxDiscount'
        expirationDate: newCoupon.expirationDate,
      };

      if (isEditingCoupon) {
        await axios.put(
          `${BASE_URL}/api/v1/coupons/${editCouponId}`,
          payload,
          config
        );
        toast.success("Identity Updated: Coupon Sync Complete! 🔄");
      } else {
        await axios.post(`${BASE_URL}/api/v1/coupons`, payload, config);
        toast.success("Protocol Active: New Coupon Deployed! 🎫");
      }

      resetForm();
      fetchCoupons();
    } catch (error) {
      // Show exact error from backend
      const msg = error.response?.data?.message || "Transmission Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewCoupon({
      code: "",
      discountPercentage: "",
      minOrderValue: "",
      maxDiscountAmount: "",
      expirationDate: "",
    });
    setIsEditingCoupon(false);
    setEditCouponId(null);
  };

  const handleEditCouponClick = (coupon) => {
    setIsEditingCoupon(true);
    setEditCouponId(coupon._id);
    // Map backend data back to form state
    setNewCoupon({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      expirationDate: new Date(coupon.expirationDate)
        .toISOString()
        .split("T")[0],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCoupon = async (id) => {
    if (
      !window.confirm("WARNING: Permanent scrub of this promo code. Proceed?")
    )
      return;
    try {
      await axios.delete(`${BASE_URL}/api/v1/coupons/${id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success("Coupon scrubbed from database");
      fetchCoupons();
    } catch (error) {
      toast.error("Scrub protocol failed");
    }
  };

  const toggleCouponStatus = async (coupon) => {
    try {
      await axios.put(
        `${BASE_URL}/api/v1/coupons/${coupon._id}`,
        { isActive: !coupon.isActive }, // Sending correct payload for update
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      toast.success(coupon.isActive ? "Offer Deactivated 🔴" : "Offer Live 🟢");
      fetchCoupons();
    } catch (error) {
      // Silent fail or toast
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 font-sans pb-20">
      {/* 🟢 LEFT: COUPON CONSTRUCTOR */}
      <div className="lg:col-span-1">
        <div
          className={`bg-gray-950 p-8 rounded-[2.5rem] border ${
            isEditingCoupon
              ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
              : "border-gray-900 shadow-2xl"
          } h-fit sticky top-24 transition-all duration-500`}
        >
          <div className="flex items-center gap-4 mb-8 border-b border-gray-900 pb-5">
            <div
              className={`p-3 rounded-2xl ${
                isEditingCoupon
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isEditingCoupon ? (
                <RefreshCw className="animate-spin-slow" />
              ) : (
                <Ticket />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                {isEditingCoupon ? "Edit" : "New"}{" "}
                <span className="text-primary">Promo</span>
              </h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                Configure Discount Logic
              </p>
            </div>
          </div>

          <form onSubmit={handleCouponSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">
                Identity Code
              </label>
              <input
                type="text"
                placeholder="E.G. FESTIVE100"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl uppercase font-black text-white focus:border-primary transition-all outline-none italic tracking-widest"
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
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">
                  Value (%)
                </label>
                <input
                  type="number"
                  placeholder="10"
                  className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
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
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">
                  Cap (₹)
                </label>
                <input
                  type="number"
                  placeholder="500"
                  className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
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

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">
                Min Cart Value (₹)
              </label>
              <input
                type="number"
                placeholder="999"
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                value={newCoupon.minOrderValue}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, minOrderValue: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2">
                Expiration Protocol
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-black border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary appearance-none"
                value={newCoupon.expirationDate}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, expirationDate: e.target.value })
                }
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] text-white transition-all active:scale-95 shadow-2xl disabled:opacity-50 flex justify-center items-center gap-2 ${
                  isEditingCoupon
                    ? "bg-blue-600 shadow-blue-600/20"
                    : "bg-primary shadow-primary/20"
                }`}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : isEditingCoupon ? (
                  "Commit Changes"
                ) : (
                  "Deploy Coupon"
                )}
              </button>
              {isEditingCoupon && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-900 border border-gray-800 px-6 rounded-[1.5rem] font-black text-gray-500 hover:text-white transition-all uppercase text-[9px] tracking-widest"
                >
                  Abort
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* 🔵 RIGHT: LIVE COUPON MATRIX */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center mb-4 pl-2">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            Available <span className="text-primary">Inventory</span>
          </h3>
          <span className="bg-gray-900 border border-gray-800 px-5 py-2 rounded-full text-gray-500 text-[10px] font-black tracking-widest uppercase">
            {coupons.length} Active Nodes
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="bg-gray-950 border-2 border-dashed border-gray-900 p-20 text-center rounded-[3rem]">
            <Ticket size={48} className="mx-auto text-gray-900 mb-6" />
            <p className="text-gray-700 font-black uppercase italic text-xs tracking-[0.3em]">
              No promo nodes detected in the marketplace
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className={`group bg-gray-950 p-6 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col md:flex-row justify-between items-center gap-6 ${
                  editCouponId === coupon._id
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-gray-900 hover:border-gray-800 shadow-2xl"
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className="bg-black p-6 rounded-[2rem] border-2 border-gray-900 flex flex-col items-center justify-center min-w-[110px] group-hover:border-primary transition-all">
                    {/* Displaying correct field: discountPercentage */}
                    <span className="text-3xl font-black text-primary italic tracking-tighter">
                      {coupon.discountPercentage}%
                    </span>
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] mt-1">
                      REDUCTION
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                      {coupon.code}
                      {!coupon.isActive && (
                        <span className="text-[8px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 tracking-widest font-black">
                          DISABLED
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium mt-2 max-w-sm">
                      Max savings of{" "}
                      <span className="text-white font-bold">
                        ₹{coupon.maxDiscountAmount}
                      </span>{" "}
                      on carts exceeding{" "}
                      <span className="text-white font-bold">
                        ₹{coupon.minOrderValue}
                      </span>
                      .
                    </p>
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-[9px] text-gray-600 font-black uppercase tracking-widest">
                        <Calendar size={12} className="text-primary/60" /> Exp:{" "}
                        {new Date(coupon.expirationDate).toLocaleDateString(
                          "en-IN"
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-blue-400 font-black uppercase tracking-widest">
                        <Users size={12} className="animate-pulse" /> Usage:{" "}
                        {coupon.usedBy?.length || 0} Pilots
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-black/40 p-4 rounded-3xl border border-gray-900">
                  <button
                    onClick={() => toggleCouponStatus(coupon)}
                    className={`transition-all hover:scale-110 ${
                      coupon.isActive ? "text-green-500" : "text-gray-700"
                    }`}
                  >
                    {coupon.isActive ? (
                      <ToggleRight size={44} />
                    ) : (
                      <ToggleLeft size={44} />
                    )}
                  </button>
                  <div className="h-10 w-[1px] bg-gray-800 mx-1"></div>
                  <button
                    onClick={() => handleEditCouponClick(coupon)}
                    className="p-4 bg-gray-900 text-gray-500 hover:text-white rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all shadow-xl"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(coupon._id)}
                    className="p-4 bg-gray-900 text-gray-500 hover:text-white rounded-2xl border border-gray-800 hover:border-primary/50 transition-all shadow-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 💡 Tactical Note */}
        <div className="flex items-center gap-4 bg-gray-900/40 border border-gray-800 p-6 rounded-[2rem]">
          <AlertCircle size={20} className="text-primary" />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
            Coupons are case-sensitive by protocol but enforced as uppercase
            here. Once a pilot (User) utilizes a code, it is permanently logged
            in their mission history.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CouponsTab;
