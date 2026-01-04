import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { BASE_URL } from "../../config";
import { Loader2, Map as MapIcon } from "lucide-react";

// Helper component to render Heatmap Layer
const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert data to Leaflet heat format: [lat, lng, intensity]
    const heatPoints = points.map((p) => [p.lat, p.lng, p.weight || 0.5]);

    const heat = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.4: "blue", 0.65: "lime", 1: "red" }, // Blue -> Green -> Red
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [points, map]);

  return null;
};

const HeatmapTab = ({ userInfo }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/orders/heatmap`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        const data = await res.json();
        setHeatmapData(data);
      } catch (err) {
        console.error("Heatmap Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, [userInfo]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 h-[600px] flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <MapIcon className="text-primary" /> Demand Heatmap
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Visualizing high-demand zones (Red = Hotspots)
          </p>
        </div>
        <div className="bg-black px-4 py-2 rounded-xl border border-gray-800 text-xs font-bold text-gray-400">
          Total Data Points:{" "}
          <span className="text-white">{heatmapData.length}</span>
        </div>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border-2 border-gray-800 relative z-0">
        <MapContainer
          center={[26.9124, 75.7873]} // Jaipur Coordinates (Default)
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          {/* Dark Mode Map Tiles (CartoDB Dark Matter) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <HeatmapLayer points={heatmapData} />
        </MapContainer>
      </div>
    </div>
  );
};

export default HeatmapTab;
