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
} from "lucide-react";
import { Geolocation } from "@capacitor/geolocation";

// 👇 1. Map Imports (Naye updates)
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

// 2. Helper Component: Map ko naye coordinates par le jaane ke liye
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 16);
  return null;
}

const Shipping = () => {
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;
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

  // 👇 3. Map State (Default: Jaipur ya purana address)
  const [mapCenter, setMapCenter] = useState([26.9124, 75.7873]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 4. Map par click karke pin change karne ka logic
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

  // 5. Reverse Geocoding (Lat/Lng se Address nikalna)
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

  const handleCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== "granted") {
        const request = await Geolocation.requestPermissions();
        if (request.location !== "granted") {
          alert("Location permission denied.");
          setLoadingLocation(false);
          return;
        }
      }

      const coordinates = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = coordinates.coords;

      // Map ko update karo
      setMapCenter([latitude, longitude]);
      // Address fields bharo
      await fetchAddressFromCoords(latitude, longitude);
    } catch (error) {
      console.error("GPS Error:", error);
      alert("Please enable GPS/Location on your phone.");
    } finally {
      setLoadingLocation(false);
    }
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
        // Optional: Location coordinates bhi bhej sakte hain backend ke liye
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

        {/* 🗺️ NEW: Map Integration Section */}
        <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-800 my-6 relative z-10 shadow-2xl">
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

        {/* 📍 GPS BUTTON */}
        <button
          onClick={handleCurrentLocation}
          type="button"
          disabled={loadingLocation}
          className="w-full flex items-center justify-center gap-3 bg-gray-900/80 hover:bg-gray-800 text-blue-400 font-semibold py-4 rounded-xl border border-gray-800 mb-8 transition-all disabled:opacity-50"
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
          {/* User Input Fields (Baki sab same rahega) */}
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
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all placeholder-gray-500 font-medium tracking-widest"
            />
          </div>

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
              className="w-full bg-gray-900 text-white pl-12 pr-4 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all placeholder-gray-500 font-medium"
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
