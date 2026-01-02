import React from "react";
import {
  User,
  Phone,
  MapPin,
  Map as MapIcon,
  Home,
  Briefcase,
  ArrowRight,
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="relative group">
        <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
          <User size={20} />
        </div>
        <input
          name="fullName"
          type="text"
          placeholder="Full Name (Receiver)"
          value={formData.fullName}
          required
          onChange={handleChange}
          className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all font-medium uppercase text-xs"
        />
      </div>

      <div className="relative group">
        <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
          <Phone size={20} />
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
          className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none tracking-widest text-xs"
        />
      </div>

      <div className="relative group">
        <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
          <MapPin size={20} />
        </div>
        <input
          name="address"
          type="text"
          placeholder="House No / Flat / Area"
          value={formData.address}
          required
          onChange={handleChange}
          className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none text-xs"
        />
      </div>

      <div className="flex gap-4">
        <input
          name="city"
          type="text"
          placeholder="City"
          value={formData.city}
          required
          onChange={handleChange}
          className="w-1/2 bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none text-xs"
        />
        <input
          name="state"
          type="text"
          placeholder="State"
          value={formData.state}
          required
          onChange={handleChange}
          className="w-1/2 bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none text-xs"
        />
      </div>

      <div className="relative group">
        <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
          <MapIcon size={20} />
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
          className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none text-xs"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {["Home", "Work"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAddressType(type)}
            className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border font-black text-[10px] uppercase tracking-widest transition-all ${
              addressType === type
                ? "bg-white text-black"
                : "bg-gray-900 text-gray-500 border-gray-800"
            }`}
          >
            {type === "Home" ? <Home size={16} /> : <Briefcase size={16} />}{" "}
            {type}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="w-full bg-primary hover:bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl shadow-xl mt-8 flex justify-center items-center gap-2 transition-all active:scale-95 shadow-primary/20"
      >
        Proceed to Payment <ArrowRight size={18} />
      </button>
    </form>
  );
};

export default AddressForm;
