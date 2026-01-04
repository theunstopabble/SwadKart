import React from "react";
import {
  User,
  Phone,
  MapPin,
  Map as MapIcon,
  Home,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const AddressForm = ({
  formData,
  setFormData,
  onSubmit,
  addressType,
  setAddressType,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 relative z-10">
      {/* 🏷️ Header Label */}
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={14} className="text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          Receiver Credentials
        </span>
      </div>

      {/* 👤 Full Name */}
      <div className="relative group">
        <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-600 group-focus-within:text-primary transition-colors">
          <User size={18} />
        </div>
        <input
          name="fullName"
          type="text"
          placeholder="Full Name (Receiver)"
          value={formData.fullName}
          required
          onChange={handleChange}
          className="w-full bg-black/40 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none transition-all font-bold uppercase text-[11px] tracking-tight placeholder:text-gray-700"
        />
      </div>

      {/* 📞 Phone Number */}
      <div className="relative group">
        <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-600 group-focus-within:text-primary transition-colors">
          <Phone size={18} />
        </div>
        <input
          name="phone"
          type="tel"
          placeholder="10-digit Phone Number"
          value={formData.phone}
          required
          maxLength={10}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              phone: e.target.value.replace(/\D/g, ""),
            }))
          }
          className="w-full bg-black/40 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none tracking-[0.2em] text-[11px] font-bold placeholder:text-gray-700"
        />
      </div>

      {/* 📍 Detailed Address */}
      <div className="relative group">
        <div className="absolute top-4 left-4 text-gray-600 group-focus-within:text-primary transition-colors">
          <MapPin size={18} />
        </div>
        <textarea
          name="address"
          placeholder="House No / Flat / Area / Landmark"
          value={formData.address}
          required
          onChange={handleChange}
          rows="2"
          className="w-full bg-black/40 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none text-[11px] font-bold placeholder:text-gray-700 resize-none"
        />
      </div>

      {/* 🏙️ City & State (Two Columns) */}
      <div className="flex gap-4">
        <input
          name="city"
          type="text"
          placeholder="City"
          value={formData.city}
          required
          onChange={handleChange}
          className="w-1/2 bg-black/40 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none text-[11px] font-bold uppercase tracking-wider placeholder:text-gray-700"
        />
        <input
          name="state"
          type="text"
          placeholder="State"
          value={formData.state}
          required
          onChange={handleChange}
          className="w-1/2 bg-black/40 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none text-[11px] font-bold uppercase tracking-wider placeholder:text-gray-700"
        />
      </div>

      {/* 📮 Pincode */}
      <div className="relative group">
        <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-600 group-focus-within:text-primary transition-colors">
          <MapIcon size={18} />
        </div>
        <input
          name="postalCode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Pincode"
          value={formData.postalCode}
          required
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              postalCode: e.target.value.replace(/\D/g, ""),
            }))
          }
          className="w-full bg-black/40 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:bg-black/60 outline-none text-[11px] font-bold tracking-[0.3em] placeholder:text-gray-700"
        />
      </div>

      {/* 🏠 Address Type Selection */}
      <div className="flex gap-3 pt-2">
        {["Home", "Work"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAddressType(type)}
            className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border font-black text-[10px] uppercase tracking-[0.2em] transition-all italic ${
              addressType === type
                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]"
                : "bg-black/20 text-gray-600 border-gray-800 hover:border-gray-600"
            }`}
          >
            {type === "Home" ? <Home size={14} /> : <Briefcase size={14} />}
            {type}
          </button>
        ))}
      </div>

      {/* 🚀 Submit Button */}
      <button
        type="submit"
        className="w-full bg-primary hover:bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl shadow-lg shadow-primary/20 mt-8 flex justify-center items-center gap-3 transition-all active:scale-95 group overflow-hidden relative"
      >
        <span className="relative z-10 flex items-center gap-2">
          Proceed to Payment{" "}
          <ArrowRight
            size={18}
            className="group-hover:translate-x-1 transition-transform"
          />
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </button>
    </form>
  );
};

export default AddressForm;
