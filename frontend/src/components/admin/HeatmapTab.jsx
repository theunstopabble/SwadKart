// ADMIN-05 FIX: Import Leaflet CSS directly here — map won't render without it
import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { BASEURL } from "../../config";
import { Loader2, Map as MapIcon } from "lucide-react";
import { toast } from "react-hot-toast";

// Helper component to render Heatmap Layer
const HeatmapLayer = ({ points }) => {
 const map = useMap();

 useEffect(() => {
 if (!points || points.length === 0) return;

 // Convert data to Leaflet heat format: [lat, lng, intensity]
 const valid = points.filter(p => p.lat && p.lng && isFinite(p.lat) && isFinite(p.lng));
 const heatPoints = valid.map((p) => [p.lat, p.lng, p.weight || 0.5]);

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

const HeatmapTab = () => {
 const [heatmapData, setHeatmapData] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const fetchHeatmap = async () => {
 try {
 const res = await fetch(`${BASEURL}/api/v1/orders/heatmap`, {
 credentials: "include",
 });
 if (res.ok) {
 const data = await res.json();
 setHeatmapData(Array.isArray(data) ? data : []);
 }
 } catch {
 toast.error("Failed to load heatmap data");
 } finally {
 setLoading(false);
 }
 };
 fetchHeatmap();
 }, []);

 if (loading)
 return (
 <div className="min-h-[300px] flex items-center justify-center" role="status" aria-label="Loading heatmap">
 <Loader2 className="animate-spin text-primary" size={40} />
 </div>
 );

 return (
 <div className="bg-gray-900 border border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 min-h-[420px] sm:min-h-[520px] md:min-h-[620px] flex flex-col shadow-2xl">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
 <MapIcon className="text-primary shrink-0" size={24} /> Demand Heatmap
 </h2>
 <p className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
 Visualizing high-demand zones (Red = Hotspots)
 </p>
 </div>
 <div className="bg-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-gray-800 text-[9px] sm:text-xs font-bold text-gray-400 shrink-0">
 Total Data Points:{" "}
 <span className="text-white">{heatmapData.length}</span>
 </div>
 </div>

 {/* ADMIN-05 FIX: Leaflet MapContainer needs explicit pixel height to render */}
 <div className="relative flex-1 rounded-2xl overflow-hidden border-2 border-gray-800">
 {heatmapData.length === 0 && (
 <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/60">
 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]">No heatmap data available</p>
 </div>
 )}
 <MapContainer
 center={[26.9124, 75.7873]} // Jaipur Coordinates (Default)
 zoom={12}
 style={{ height: "100%", width: "100%" }}
 className="min-h-[280px] sm:min-h-[380px] md:min-h-[500px]"
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
