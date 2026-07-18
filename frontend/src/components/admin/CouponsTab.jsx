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
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { BASEURL } from "../../config";

const CouponsTab = ({ fetchAllData }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
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
  const { data } = await axios.get(`${BASEURL}/api/v1/coupons`, {
  withCredentials: true,
  });
  setCoupons(data);
  } catch {
  console.error("Error fetching coupons");
  } finally {
  setPageLoading(false);
  }
  };

  useEffect(() => {
  fetchCoupons();
  const onFocus = () => { fetchCoupons(); };
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
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
  withCredentials: true,
  headers: {
  "Content-Type": "application/json",
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
  `${BASEURL}/api/v1/coupons/${editCouponId}`,
  payload,
  config,
  );
  toast.success("Identity Updated: Coupon Sync Complete! 🔄");
  } else {
  await axios.post(`${BASEURL}/api/v1/coupons`, payload, config);
  toast.success("Protocol Active: New Coupon Deployed! 🎫");
  }

  resetForm();
  fetchCoupons();
  if (fetchAllData) fetchAllData();
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
  await axios.delete(`${BASEURL}/api/v1/coupons/${id}`, {
  withCredentials: true,
  });
  toast.success("Coupon scrubbed from database");
  fetchCoupons();
  if (fetchAllData) fetchAllData();
  } catch {
  toast.error("Scrub protocol failed");
  }
  };

  const toggleCouponStatus = async (coupon) => {
  try {
  await axios.put(
  `${BASEURL}/api/v1/coupons/${coupon._id}`,
  { isActive: !coupon.isActive },
  { withCredentials: true },
  );
  toast.success(coupon.isActive ? "Offer Deactivated 🔴" : "Offer Live 🟢");
  fetchCoupons();
  if (fetchAllData) fetchAllData();
  } catch {
  toast.error("Toggle failed");
  }
  };

  if (pageLoading) {
  return (
  <div className="space-y-4 sm:space-y-6 animate-pulse pb-20">
  {Array.from({ length: 2 }).map((_, i) => (
  <div key={i} className="bg-gray-950 border border-gray-900 rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
  <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6">
  <div className="w-[80px] sm:min-w-[110px] h-[80px] sm:h-[110px] bg-gray-900 rounded-xl sm:rounded-[2rem]" />
  <div className="flex-1 space-y-3">
  <div className="h-5 sm:h-6 bg-gray-900 rounded w-1/3" />
  <div className="h-3 sm:h-4 bg-gray-900 rounded w-2/3" />
  <div className="h-10 sm:h-12 bg-gray-900 rounded-xl w-40" />
  </div>
  </div>
  </div>
  ))}
  </div>
  );
  }

  return (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700 font-sans pb-20">
  {/* 🟢 LEFT: COUPON CONSTRUCTOR */}
  <div className="lg:col-span-1">
  <div
  className={`bg-gray-950 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border ${
  isEditingCoupon
  ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
  : "border-gray-900 shadow-2xl"
  } h-fit sticky top-24 transition-all duration-500`}
  >
  <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-gray-900 pb-4 sm:pb-5">
  <div
  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${
  isEditingCoupon
  ? "bg-blue-500/10 text-blue-500"
  : "bg-primary/10 text-primary"
  }`}
  >
  {isEditingCoupon ? (
  <RefreshCw className="animate-spin-slow" size={16} />
  ) : (
  <Ticket size={16} />
  )}
  </div>
  <div>
  <h3 className="text-base sm:text-xl font-black uppercase tracking-tighter text-white">
  {isEditingCoupon ? "Edit" : "New"}{" "}
  <span className="text-primary">Promo</span>
  </h3>
  <p className="text-[8px] sm:text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">
  Configure Discount Logic
  </p>
  </div>
  </div>

  <form onSubmit={handleCouponSubmit} className="space-y-4 sm:space-y-6">
  <div className="space-y-1.5 sm:space-y-2">
  <label className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] ml-1.5 sm:ml-2">
  Identity Code
  </label>
  <input
  type="text"
  placeholder="E.G. FESTIVE100"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl uppercase font-black text-sm sm:text-base text-white focus:border-primary transition-all outline-none tracking-widest"
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

  <div className="grid grid-cols-2 gap-3 sm:gap-4">
  <div className="space-y-1.5 sm:space-y-2">
  <label className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] ml-1.5 sm:ml-2">
  Value (%)
  </label>
  <input
  type="number"
  placeholder="10"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
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
  <div className="space-y-1.5 sm:space-y-2">
  <label className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] ml-1.5 sm:ml-2">
  Cap (₹)
  </label>
  <input
  type="number"
  placeholder="500"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
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

  <div className="space-y-1.5 sm:space-y-2">
  <label className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] ml-1.5 sm:ml-2">
  Min Cart Value (₹)
  </label>
  <input
  type="number"
  placeholder="999"
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary"
  value={newCoupon.minOrderValue}
  onChange={(e) =>
  setNewCoupon({ ...newCoupon, minOrderValue: e.target.value })
  }
  required
  />
  </div>

  <div className="space-y-1.5 sm:space-y-2">
  <label className="text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-[0.25em] sm:tracking-[0.3em] ml-1.5 sm:ml-2">
  Expiration Protocol
  </label>
  <input
  type="date"
  min={new Date().toISOString().split("T")[0]}
  className="w-full bg-black border border-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-white font-bold outline-none focus:border-primary appearance-none"
  value={newCoupon.expirationDate}
  onChange={(e) =>
  setNewCoupon({ ...newCoupon, expirationDate: e.target.value })
  }
  required
  />
  </div>

  <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
  <button
  type="submit"
  disabled={loading}
  className={`flex-1 py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] text-white transition-all active:scale-95 shadow-2xl disabled:opacity-50 flex justify-center items-center gap-2 ${
  isEditingCoupon
  ? "bg-blue-600 shadow-blue-600/20"
  : "bg-primary shadow-primary/20"
  }`}
  >
  {loading ? (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
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
  className="bg-gray-900 border border-gray-800 px-4 sm:px-6 rounded-xl sm:rounded-[1.5rem] font-black text-gray-500 hover:text-white transition-all uppercase text-[8px] sm:text-[9px] tracking-widest"
  >
  Abort
  </button>
  )}
  </div>
  </form>
  </div>
  </div>

  {/* 🔵 RIGHT: LIVE COUPON MATRIX */}
  <div className="lg:col-span-2 space-y-4 sm:space-y-6">
  <div className="flex justify-between items-center mb-2 sm:mb-4">
  <h3 className="text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tighter text-white">
  Available <span className="text-primary">Inventory</span>
  </h3>
  <span className="bg-gray-900 border border-gray-800 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-gray-500 text-[8px] sm:text-[10px] font-black tracking-widest uppercase shrink-0">
  {coupons.length} Active Nodes
  </span>
  </div>

  {coupons.length === 0 ? (
  <div className="bg-gray-950 border-2 border-dashed border-gray-900 p-10 sm:p-20 text-center rounded-2xl sm:rounded-[3rem]">
  <Ticket size={24} className="mx-auto text-gray-900 mb-4 sm:mb-6" />
  <p className="text-gray-700 font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em]">
  No promo nodes detected in the marketplace
  </p>
  </div>
  ) : (
  <div className="grid grid-cols-1 gap-4 sm:gap-6">
  {coupons.map((coupon) => (
  <div
  key={coupon._id}
  className={`group bg-gray-950 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 ${
  editCouponId === coupon._id
  ? "border-blue-500 bg-blue-500/5"
  : "border-gray-900 hover:border-gray-800 shadow-2xl"
  }`}
  >
  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
  <div className="bg-black p-4 sm:p-6 rounded-xl sm:rounded-[2rem] border-2 border-gray-900 flex flex-col items-center justify-center min-w-[80px] sm:min-w-[110px] group-hover:border-primary transition-all">
  {/* Displaying correct field: discountPercentage */}
  <span className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
  {coupon.discountPercentage ?? 0}%
  </span>
  <span className="text-[7px] sm:text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-0.5 sm:mt-1">
  REDUCTION
  </span>
  </div>
  <div className="text-center sm:text-left min-w-0">
  <h4 className="text-base sm:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
  <span className="truncate max-w-[120px] sm:max-w-none">{coupon.code}</span>
  {!coupon.isActive && (
  <span className="text-[7px] sm:text-[8px] bg-red-500/10 text-red-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-red-500/20 tracking-widest font-black shrink-0">
  DISABLED
  </span>
  )}
  </h4>
  <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-gray-500 font-medium mt-1 sm:mt-2">
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
  <div className="flex items-center gap-3 sm:gap-6 mt-3 sm:mt-4 justify-center sm:justify-start">
  <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-gray-600 font-black uppercase tracking-widest">
  <Calendar size={8} className="text-primary/60" /> Exp:{" "}
  {new Date(coupon.expirationDate).toLocaleDateString(
  "en-IN",
  )}
  </div>
  <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-blue-400 font-black uppercase tracking-widest">
  <Users size={8} className="animate-pulse" /> Usage:{" "}
  {coupon.usedBy?.length || 0} Pilots
  </div>
  </div>
  </div>
  </div>

  <div className="flex items-center gap-2 sm:gap-3 bg-black/40 p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-900 w-full md:w-auto justify-center">
  <button
  onClick={() => toggleCouponStatus(coupon)}
  className={`transition-all hover:scale-110 ${
  coupon.isActive ? "text-green-500" : "text-gray-700"
  }`}
  >
  {coupon.isActive ? (
  <ToggleRight size={28} />
  ) : (
  <ToggleLeft size={28} />
  )}
  </button>
  <div className="h-8 sm:h-10 w-[1px] bg-gray-800 mx-0.5 sm:mx-1"></div>
  <button
  onClick={() => handleEditCouponClick(coupon)}
  className="p-2.5 sm:p-4 bg-gray-900 text-gray-500 hover:text-white rounded-xl sm:rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all shadow-xl"
  >
  <Edit2 size={12} />
  </button>
  <button
  onClick={() => handleDeleteCoupon(coupon._id)}
  className="p-2.5 sm:p-4 bg-gray-900 text-gray-500 hover:text-white rounded-xl sm:rounded-2xl border border-gray-800 hover:border-primary/50 transition-all shadow-xl"
  >
  <Trash2 size={12} />
  </button>
  </div>
  </div>
  ))}
  </div>
  )}

  {/* 💡 Tactical Note */}
  <div className="flex items-center gap-3 sm:gap-4 bg-gray-900/40 border border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem]">
  <AlertCircle size={14} className="text-primary shrink-0" />
  <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">
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
