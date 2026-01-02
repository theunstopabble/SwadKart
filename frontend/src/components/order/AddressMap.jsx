import React from "react";
import { Search, Loader2, Navigation, MapPin } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Marker Icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

const AddressMap = ({
  mapCenter,
  setMapCenter,
  onMapClick,
  searchQuery,
  setSearchQuery,
  handleSearch,
  isSearching,
  handleCurrentLocation,
  loadingLocation,
}) => {
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return <Marker position={mapCenter} />;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative group z-20">
        <div className="absolute top-4 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Search area (e.g. Mansarovar, Jaipur)"
          className="w-full bg-gray-900 text-white pl-12 pr-24 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all shadow-lg text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="absolute right-2 top-2 bottom-2 px-4 bg-gray-800 hover:bg-white hover:text-black text-white text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Find"
          )}
        </button>
      </div>

      {/* Map Container */}
      <div className="w-full h-64 rounded-[2rem] overflow-hidden border border-gray-800 relative z-10 shadow-2xl">
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

      {/* GPS Button */}
      <button
        onClick={handleCurrentLocation}
        type="button"
        disabled={loadingLocation}
        className="w-full flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary text-primary hover:text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl border border-primary/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {loadingLocation ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Navigation size={18} />
        )}
        <span>
          {loadingLocation ? "Locating..." : "Use My Current Location"}
        </span>
      </button>
    </div>
  );
};

export default AddressMap;
