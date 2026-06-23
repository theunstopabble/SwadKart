import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getSocket } from "../../utils/socket";
import { BASEURL } from "../../config";

// 🛵 Custom Driver Icon (SVG string for high quality)
const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
});

// 🏠 User Home Icon
const homeIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1239/1239525.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// 🔄 Helper Component to auto-move map when driver moves
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

const LiveTrackingMap = ({ orderId, restaurantCoords, userCoords }) => {
  // Default position agar signal na mile (Jaipur example)
  const [driverPos, setDriverPos] = useState(
    restaurantCoords || [26.9124, 75.7873],
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !orderId) return;

    socket.emit("joinOrder", orderId);

    const handleDriverLocation = (coords) => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      if (lat && lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        setDriverPos([lat, lng]);
      }
    };
    socket.on("driverLocationUpdate", handleDriverLocation);

    return () => {
      socket.off("driverLocationUpdate", handleDriverLocation);
      socket.emit("leaveOrder", orderId);
    };
  }, [orderId]);

  return (
    <div className="h-[350px] md:h-[450px] w-full rounded-[3rem] overflow-hidden border-4 border-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
      {/* Overlay UI */}
      <div className="absolute top-6 left-6 z-[1000] bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-primary/20 flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white italic">
          Live Tracking Active
        </span>
      </div>

      <MapContainer
        center={driverPos}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // 🌑 Pro Dark Theme Map
          attribution="&copy; SwadKart Intelligence"
        />

        <ChangeView center={driverPos} />

        {/* 🛵 Driver Position */}
        <Marker position={driverPos} icon={driverIcon}>
          <Popup className="font-black">आपका खाना यहाँ है! 🚀</Popup>
        </Marker>

        {/* 🏠 Customer/User Home */}
        {userCoords && (
          <Marker position={userCoords} icon={homeIcon}>
            <Popup>आपका घर 🏠</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LiveTrackingMap;
