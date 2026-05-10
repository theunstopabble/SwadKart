import React, { useState } from "react";
import { MapPin, Clock, TrendingUp, DollarSign, Navigation } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const DeliveryCalculator = () => {
  const [form, setForm] = useState({ distanceKm: "", orderSubtotal: "", isSurgeActive: false, hasSwadPass: false });
  const [routeResult, setRouteResult] = useState(null);
  const [feeResult, setFeeResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateFee = async () => {
    if (!form.distanceKm) {
      toast.error("Enter distance in km");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/delivery-calculator/fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          distanceKm: parseFloat(form.distanceKm),
          isSurgeActive: form.isSurgeActive,
          hasSwadPass: form.hasSwadPass,
          orderSubtotal: parseFloat(form.orderSubtotal) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFeeResult(data);
    } catch (_err) { void _err; } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!form.pickupLat || !form.pickupLng || !form.dropLat || !form.dropLng) {
      toast.error("Enter all coordinates");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/delivery-calculator/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pickupLat: parseFloat(form.pickupLat),
          pickupLng: parseFloat(form.pickupLng),
          dropLat: parseFloat(form.dropLat),
          dropLng: parseFloat(form.dropLng),
          vehicleType: form.vehicleType || "scooter",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRouteResult(data);
    } catch (_err) { void _err; } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <MapPin className="text-green-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Delivery Fee Calculator</h3>
            <p className="text-xs text-gray-400">Distance-based, surge-aware delivery pricing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Distance (km)</label>
            <input
              type="number"
              step="0.1"
              value={form.distanceKm}
              onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none"
              placeholder="3.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Order Subtotal (₹)</label>
            <input
              type="number"
              value={form.orderSubtotal}
              onChange={(e) => setForm({ ...form, orderSubtotal: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none"
              placeholder="250"
            />
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isSurgeActive}
              onChange={(e) => setForm({ ...form, isSurgeActive: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            Surge Active
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasSwadPass}
              onChange={(e) => setForm({ ...form, hasSwadPass: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            SwadPass Member
          </label>
        </div>

        <button
          onClick={calculateFee}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? "Calculating..." : "Calculate Fee"}
        </button>

        {feeResult && (
          <div className="mt-6 space-y-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Base Fee</span>
                <span className="text-sm font-bold text-white">₹{feeResult.baseFee}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Distance Surcharge</span>
                <span className="text-sm font-bold text-white">₹{feeResult.distanceSurcharge}</span>
              </div>
              {feeResult.surgeAmount > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-yellow-400">Surge ({feeResult.surgeMultiplier}x)</span>
                  <span className="text-sm font-bold text-yellow-400">₹{feeResult.surgeAmount}</span>
                </div>
              )}
              <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total Delivery Fee</span>
                <span className={`text-xl font-bold ${feeResult.freeDelivery ? "text-green-400" : "text-white"}`}>
                  {feeResult.freeDelivery ? "FREE" : `₹${feeResult.totalDeliveryFee}`}
                </span>
              </div>
            </div>
            {feeResult.freeDelivery && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-sm text-green-400 font-bold">Free delivery applied!</p>
                {feeResult.hasSwadPass && <p className="text-xs text-green-400/70">SwadPass benefit</p>}
                {!feeResult.hasSwadPass && <p className="text-xs text-green-400/70">Order above ₹{feeResult.freeDeliveryThreshold}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Navigation className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Route Fee Estimator</h3>
            <p className="text-xs text-gray-400">Calculate fees by vehicle type and route</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Pickup Lat</label>
            <input type="number" step="any" value={form.pickupLat || ""} onChange={(e) => setForm({ ...form, pickupLat: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="28.6139" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Pickup Lng</label>
            <input type="number" step="any" value={form.pickupLng || ""} onChange={(e) => setForm({ ...form, pickupLng: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="77.2090" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Drop Lat</label>
            <input type="number" step="any" value={form.dropLat || ""} onChange={(e) => setForm({ ...form, dropLat: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="28.6304" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Drop Lng</label>
            <input type="number" step="any" value={form.dropLng || ""} onChange={(e) => setForm({ ...form, dropLng: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="77.2177" />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Vehicle Type</label>
          <div className="flex gap-3">
            {["bicycle", "scooter", "bike"].map((type) => (
              <button
                key={type}
                onClick={() => setForm({ ...form, vehicleType: type })}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                  form.vehicleType === type ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button onClick={calculateRoute} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {loading ? "Calculating..." : "Calculate Route Fee"}
        </button>

        {routeResult && (
          <div className="mt-6 bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Distance</p>
                <p className="text-lg font-bold text-white">{routeResult.distanceKm} km</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">ETA</p>
                <p className="text-lg font-bold text-blue-400">{routeResult.etaMinutes} min</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Fee</p>
                <p className="text-lg font-bold text-green-400">₹{routeResult.totalFee}</p>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Fee Breakdown</p>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Base Fee</span><span>₹{routeResult.feeBreakdown.baseFee}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Distance Fee</span><span>₹{routeResult.feeBreakdown.distanceFee}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Time Fee</span><span>₹{routeResult.feeBreakdown.timeFee}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryCalculator;