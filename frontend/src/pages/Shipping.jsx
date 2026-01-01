import { useState, useEffect } from "react";
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
  Map as MapIcon,
  Loader2,
  User,
  Search,
} from "lucide-react";

// ❌ Removed Capacitor Import (Web Mode Active)

// 1. Map Imports
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Marker Fix for Leaflet
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// 2. Helper Component: Map View Updater
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

const Shipping = () => {
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;
  const { userInfo } = useSelector((state) => state.user);

  // Form States
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

  // Map & Search States
  const [mapCenter, setMapCenter] = useState([26.9124, 75.7873]); // Default: Jaipur
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 3. Reverse Geocoding: Coords -> Address
  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.address) {
        const street =
          data.address.road ||
          data.address.suburb ||
          data.address.neighbourhood ||
          "";
        const area = data.display_name.split(",")[0];

        // Auto-fill fields
        setAddress(`${area}, ${street}`);
        setCity(
          data.address.city || data.address.town || data.address.village || ""
        );
        setPostalCode(data.address.postcode || "");
        setState(data.address.state || "");
      }
    } catch (error) {
      console.error("Geocoding Error:", error);
    }
  };

  // 4. Search Logic
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=in`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(newPos);
        await fetchAddressFromCoords(lat, lon);
      } else {
        alert("Area not found. Try adding city name.");
      }
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 5. Map Click Logic
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMapCenter([lat, lng]);
        fetchAddressFromCoords(lat, lng);
      },
    });
    return <Marker position={mapCenter} />;
  };

  // 6. 🌐 NATIVE BROWSER GPS (Replacement for Capacitor)
  const handleCurrentLocation = () => {
    setLoadingLocation(true);

    // Check if browser supports Geolocation
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Success
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        await fetchAddressFromCoords(latitude, longitude);
        setLoadingLocation(false);
      },
      (error) => {
        // Error
        console.error("GPS Error:", error);
        let msg = "Unable to retrieve your location.";
        if (error.code === 1)
          msg =
            "Location permission denied. Please enable it in browser settings.";
        alert(msg);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true } // Options
    );
  };

  const submitHandler = (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    dispatch(
      saveShippingAddress({
        fullName,
        address,
        city,
        postalCode,
        country: "India",
        state,
        phone,
        addressType,
        lat: mapCenter[0],
        lng: mapCenter[1],
      })
    );
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-20">
      <CheckoutSteps step1 step2 />

      <div className="max-w-lg mx-auto mt-8">
        <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
          Delivery Location <MapPin className="text-primary" />
        </h1>

        {/* 🔍 Search Bar Section */}
        <form onSubmit={handleSearch} className="relative mt-6 mb-4 group z-20">
          <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-blue-500 transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search area (e.g. Mansarovar, Jaipur)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 text-white pl-12 pr-24 py-4 rounded-xl border border-gray-800 focus:border-blue-500 outline-none transition-all shadow-lg"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </form>

        {/* 🗺️ Leaflet Map Section */}
        <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-800 mb-6 relative z-10 shadow-2xl">
          <MapContainer
            center={mapCenter}
            zoom={16}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ChangeView center={mapCenter} />
            <LocationMarker />
          </MapContainer>
        </div>

        {/* 📍 GPS Button */}
        <button
          onClick={handleCurrentLocation}
          type="button"
          disabled={loadingLocation}
          className="w-full flex items-center justify-center gap-3 bg-gray-900/80 hover:bg-gray-800 text-blue-400 font-semibold py-4 rounded-xl border border-gray-800 mb-8 transition-all active:scale-95 disabled:opacity-50"
        >
          {loadingLocation ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : (
            <Navigation size={20} />
          )}
          <span>
            {loadingLocation ? "Locating..." : "Use My Current Location"}
          </span>
        </button>

        <form onSubmit={submitHandler} className="space-y-5">
          {/* Receiver Name */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
              <User size={20} />
            </div>
            <input
              type="text"
              placeholder="Full Name (Receiver)"
              value={fullName}
              required
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all font-medium"
            />
          </div>

          {/* Phone */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
              <Phone size={20} />
            </div>
            <input
              type="tel"
              placeholder="10-digit Phone Number"
              value={phone}
              required
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none tracking-widest"
            />
          </div>

          {/* Address */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary">
              <MapPin size={20} />
            </div>
            <input
              type="text"
              placeholder="House No / Flat / Area"
              value={address}
              required
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
            />
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="City"
              value={city}
              required
              onChange={(e) => setCity(e.target.value)}
              className="w-1/2 bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
            />
            <input
              type="text"
              placeholder="State"
              value={state}
              required
              onChange={(e) => setState(e.target.value)}
              className="w-1/2 bg-gray-900 text-white px-5 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none"
            />
          </div>

          {/* Pincode */}
          <div className="relative group">
            <div className="absolute top-4 left-4 text-gray-500">
              <MapIcon size={20} />
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

          {/* Address Type Buttons */}
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
