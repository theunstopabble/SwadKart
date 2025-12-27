import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { saveShippingAddress } from "../redux/cartSlice";
import CheckoutSteps from "../components/CheckoutSteps";
import {
  MapPin,
  Navigation,
  Home,
  Briefcase,
  ArrowRight,
  Phone,
  Map,
  Loader2,
  User,
} from "lucide-react";
// 👇 Import Capacitor Geolocation
import { Geolocation } from "@capacitor/geolocation";

const Shipping = () => {
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;
  // User info se naam utha lo agar pehle se login hai
  const { userInfo } = useSelector((state) => state.user);

  // States
  const [fullName, setFullName] = useState(
    shippingAddress?.fullName || userInfo?.name || ""
  );
  const [address, setAddress] = useState(shippingAddress?.address || "");
  const [city, setCity] = useState(shippingAddress?.city || "");
  const [postalCode, setPostalCode] = useState(
    shippingAddress?.postalCode || ""
  );
  const [state, setState] = useState(shippingAddress?.state || "");
  const [phone, setPhone] = useState(shippingAddress?.phone || "");
  const [addressType, setAddressType] = useState(
    shippingAddress?.addressType || "Home"
  );

  const [loadingLocation, setLoadingLocation] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    // 🔥 DATA SAVING: Sab kuch Redux me bhejo
    dispatch(
      saveShippingAddress({
        fullName, // NEW: Receiver Name
        address,
        city,
        postalCode,
        country: "India",
        state,
        phone,
        addressType,
      })
    );
    navigate("/payment");
  };

  // 🛰️ NATIVE GPS LOCATION (Fix for Permission Error)
  const handleCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      // 1. Permission Check
      const permissions = await Geolocation.checkPermissions();

      // Agar permission nahi mili, to maango
      if (permissions.location !== "granted") {
        const request = await Geolocation.requestPermissions();
        if (request.location !== "granted") {
          alert("Location permission denied. Please enable it in settings.");
          setLoadingLocation(false);
          return;
        }
      }

      // 2. Get Coordinates
      const coordinates = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = coordinates.coords;

      // 3. Convert to Address (OpenStreetMap API)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      if (data && data.address) {
        const street =
          data.address.road ||
          data.address.suburb ||
          data.address.neighbourhood ||
          "";
        const area = data.display_name.split(",")[0];

        setAddress(`${area}, ${street}`);
        setCity(
          data.address.city || data.address.town || data.address.village || ""
        );
        setPostalCode(data.address.postcode || "");
        setState(data.address.state || "");
        // alert("Location Found: " + data.address.city);
      } else {
        alert("Address details not found.");
      }
    } catch (error) {
      console.error("GPS Error:", error);
      alert("Please enable GPS/Location on your phone.");
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-20">
      <CheckoutSteps step1 step2 />

      <div className="max-w-lg mx-auto mt-8 animate-in slide-in-from-bottom-5 duration-500">
        <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
          Add Address <MapPin className="text-primary fill-current" />
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Correct details help us deliver faster!
        </p>

        {/* 📍 GPS BUTTON */}
        <button
          onClick={handleCurrentLocation}
          type="button"
          disabled={loadingLocation}
          className="w-full flex items-center justify-center gap-3 bg-gray-900/80 hover:bg-gray-800 text-blue-400 font-semibold py-4 rounded-xl border border-gray-800 transition-all mb-8 shadow-lg active:scale-95 group disabled:opacity-50"
        >
          {loadingLocation ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : (
            <Navigation size={20} />
          )}
          <span>
            {loadingLocation ? "Detecting Location..." : "Use Current Location"}
          </span>
        </button>

        <form onSubmit={submitHandler} className="space-y-5">
          {/* 👤 Full Name (NEW SECTION) */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
              <User size={20} />
            </div>
            <input
              type="text"
              placeholder="Full Name (Receiver)"
              value={fullName}
              required
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-500 font-medium"
            />
          </div>

          {/* 📞 Phone Number */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
              <Phone size={20} />
            </div>
            <input
              type="tel"
              placeholder="10-digit Phone Number"
              value={phone}
              required
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-500 font-medium tracking-widest"
            />
          </div>

          {/* 🏠 Address */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
              <MapPin size={20} />
            </div>
            <input
              type="text"
              placeholder="House No / Flat / Area"
              value={address}
              required
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-500 font-medium"
            />
          </div>

          {/* 🏙️ City & State */}
          <div className="flex gap-4">
            <div className="relative group w-1/2">
              <input
                type="text"
                placeholder="City"
                value={city}
                required
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
              />
            </div>
            <div className="relative group w-1/2">
              <input
                type="text"
                placeholder="State"
                value={state}
                required
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* 📮 Pincode */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
              <Map size={20} />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Pincode"
              value={postalCode}
              required
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
            />
          </div>

          {/* 🏷️ Address Type */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddressType("Home")}
              className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 border ${
                addressType === "Home"
                  ? "bg-white text-black font-bold"
                  : "bg-gray-900 text-gray-400 border-gray-800"
              }`}
            >
              <Home size={18} /> Home
            </button>
            <button
              type="button"
              onClick={() => setAddressType("Work")}
              className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 border ${
                addressType === "Work"
                  ? "bg-white text-black font-bold"
                  : "bg-gray-900 text-gray-400 border-gray-800"
              }`}
            >
              <Briefcase size={18} /> Work
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg mt-8 flex justify-center items-center gap-2 transition-all active:scale-95"
          >
            Save & Continue <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Shipping;
