import React from "react";
import { Search, Loader2, Navigation, MapPin, Target } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Marker Icon to match Primary Theme
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "hue-rotate-[140deg] brightness-110", // Making standard blue icon look more like Primary Red/Orange
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
    return (
      <Marker position={mapCenter}>
        {/* Optional: Add Tooltip/Popup if needed */}
      </Marker>
    );
  };

  return (
    <div className="space-y-6">
      {/* 🔍 Search Bar - Premium Glassmorphism */}
      <div className="relative group z-20">
        <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-500 group-focus-within:text-primary transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search area (e.g. Mansarovar, Jaipur)"
          className="w-full bg-black/50 text-white pl-12 pr-28 py-4 rounded-xl border border-gray-800 focus:border-primary outline-none transition-all shadow-lg text-[11px] font-bold uppercase tracking-tight placeholder:text-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="absolute right-2 top-2 bottom-2 px-6 bg-primary/10 hover:bg-primary text-primary hover:text-white text-[10px] font-black uppercase rounded-lg transition-all disabled:opacity-50 border border-primary/20 flex items-center gap-2"
        >
          {isSearching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "Find"
          )}
        </button>
      </div>

      {/* 🗺️ Map Container - Dark Mode Styling */}
      <div className="w-full h-72 rounded-[2.5rem] overflow-hidden border border-gray-800 relative z-10 shadow-2xl group">
        {/* Floating Target Overlay */}
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/80 p-2 rounded-full border border-gray-700">
            <Target size={16} className="text-primary animate-pulse" />
          </div>
        </div>

        <MapContainer
          center={mapCenter}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
          className="dark-map-layer" // Custom CSS Class for filtering
        >
          {/* TileLayer with Dark Filter via CSS below */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; SwadKart Maps"
          />
          <ChangeView center={mapCenter} />
          <LocationMarker />
        </MapContainer>

        {/* CSS for Dark Map Layer */}
        <style>{`
          .dark-map-layer .leaflet-tile-container {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
          }
          .leaflet-container {
            background: #000 !important;
          }
          .leaflet-control-attribution {
            display: none !important;
          }
        `}</style>
      </div>

      {/* 🛰️ GPS Button - Action Style */}
      <button
        onClick={handleCurrentLocation}
        type="button"
        disabled={loadingLocation}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-primary text-black hover:text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl border border-white transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5 group italic"
      >
        {loadingLocation ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Navigation size={18} className="group-hover:animate-bounce" />
        )}
        <span>
          {loadingLocation ? "Scanning Grid..." : "Use My Current Location"}
        </span>
      </button>
    </div>
  );
};

export default AddressMap;
