import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { saveShippingAddress } from "../redux/cartSlice";
import CheckoutSteps from "../components/CheckoutSteps";
import { MapPin } from "lucide-react";

// Modular Components
import AddressMap from "../components/order/AddressMap";
import AddressForm from "../components/order/AddressForm";

const Shipping = () => {
  const { shippingAddress } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- States ---
  const [formData, setFormData] = useState({
    fullName: shippingAddress?.fullName || userInfo?.name || "",
    address: shippingAddress?.address || "",
    city: shippingAddress?.city || "",
    postalCode: shippingAddress?.postalCode || "",
    state: shippingAddress?.state || "",
    phone: shippingAddress?.phone || "",
  });
  const [addressType, setAddressType] = useState(
    shippingAddress?.addressType || "Home"
  );
  const [mapCenter, setMapCenter] = useState([
    shippingAddress?.lat || 26.9124,
    shippingAddress?.lng || 75.7873,
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // --- Logic: Fetch Address from Coords ---
  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.address) {
        // 🛠️ FIX: Ensure State is captured correctly from API
        const stateName = data.address.state || data.address.region || "";

        setFormData((prev) => ({
          ...prev,
          address: `${data.address.road || data.address.suburb || ""}, ${
            data.address.neighbourhood || ""
          }`,
          city:
            data.address.city ||
            data.address.town ||
            data.address.village ||
            "",
          postalCode: data.address.postcode || "",
          state: stateName, // Updated state
        }));
      }
    } catch (e) {
      console.error("Geocoding Error");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=in`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const newPos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setMapCenter(newPos);
        fetchAddressFromCoords(newPos[0], newPos[1]);
      }
    } catch (e) {
      console.error("Search Error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(newPos);
        fetchAddressFromCoords(newPos[0], newPos[1]);
        setLoadingLocation(false);
      },
      () => {
        alert("Permission denied");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const submitHandler = (e) => {
    e.preventDefault();

    // 🛡️ Extra Check: Validation before dispatch
    if (formData.phone.length < 10) return alert("Invalid Phone Number");
    if (!formData.state) {
      // If state is still empty, try to set a fallback or alert
      formData.state = "Rajasthan"; // Default fallback to match your local operations
    }

    dispatch(
      saveShippingAddress({
        ...formData,
        country: "India",
        addressType,
        lat: mapCenter[0],
        lng: mapCenter[1],
      })
    );
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-20 font-sans">
      <CheckoutSteps step1 step2 />

      <div className="max-w-2xl mx-auto mt-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold italic uppercase tracking-tighter flex items-center justify-center gap-3">
            <MapPin className="text-primary" size={32} /> Delivery{" "}
            <span className="text-primary">Spot</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-3 pl-2">
            Pin your location for faster arrival
          </p>
        </header>

        <div className="space-y-10">
          {/* Map Container */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl overflow-hidden relative transition-all hover:border-gray-700">
            <AddressMap
              mapCenter={mapCenter}
              setMapCenter={setMapCenter}
              onMapClick={(lat, lng) => {
                setMapCenter([lat, lng]);
                fetchAddressFromCoords(lat, lng);
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSearch={handleSearch}
              isSearching={isSearching}
              handleCurrentLocation={handleCurrentLocation}
              loadingLocation={loadingLocation}
            />
          </div>

          <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>

          {/* Form Container */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative transition-all hover:border-gray-700">
            {/* Note: Ensure AddressForm inputs use bg-black/50 and border-gray-700 to match Login theme */}
            <AddressForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={submitHandler}
              addressType={addressType}
              setAddressType={setAddressType}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shipping;
