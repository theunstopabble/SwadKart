import React, { useState } from "react";
import { DollarSign, TrendingUp, Target, Award } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const DriverEarningsCalculator = () => {
  const [form, setForm] = useState({
    distanceKm: "",
    orderValue: "",
    isPeakHour: false,
    isSurgeActive: false,
    vehicleType: "scooter",
  });
  const [result, setResult] = useState(null);
  const [incentives, setIncentives] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateEarnings = async () => {
    if (!form.distanceKm) { toast.error("Enter distance"); return; }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/driver-earnings/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          distanceKm: parseFloat(form.distanceKm),
          orderValue: parseFloat(form.orderValue) || 0,
          isPeakHour: form.isPeakHour,
          isSurgeActive: form.isSurgeActive,
          vehicleType: form.vehicleType,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
    } catch (_err) { toast.error("Failed to calculate earnings"); void _err; } finally {
      setLoading(false);
    }
  };

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/driver-earnings/incentives`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIncentives(data);
    } catch {
      toast.error("Failed to load incentives");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <DollarSign className="text-green-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Driver Earnings Calculator</h3>
            <p className="text-xs text-gray-400">Estimate earnings per delivery</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Distance (km)</label>
            <input type="number" step="0.1" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="5.5" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Order Value (₹)</label>
            <input type="number" value={form.orderValue} onChange={(e) => setForm({ ...form, orderValue: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="450" />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Vehicle Type</label>
          <div className="flex gap-3">
            {["bicycle", "scooter", "bike"].map((type) => (
              <button key={type} onClick={() => setForm({ ...form, vehicleType: type })} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${form.vehicleType === type ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{type}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.isPeakHour} onChange={(e) => setForm({ ...form, isPeakHour: e.target.checked })} className="w-4 h-4 accent-primary" />
            Peak Hour (+₹20)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.isSurgeActive} onChange={(e) => setForm({ ...form, isSurgeActive: e.target.checked })} className="w-4 h-4 accent-primary" />
            Surge (+20%)
          </label>
        </div>

        <button onClick={calculateEarnings} disabled={loading} className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {loading ? "Calculating..." : "Calculate Earnings"}
        </button>

        {result && (
          <div className="mt-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Gross</p>
                <p className="text-xl font-bold text-green-400">₹{result.grossEarnings}</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 text-center border border-yellow-500/20">
                <p className="text-[10px] text-yellow-400 uppercase tracking-wider">Platform (10%)</p>
                <p className="text-xl font-bold text-yellow-400">-₹{result.platformCut}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                <p className="text-[10px] text-green-400 uppercase tracking-wider">Net</p>
                <p className="text-xl font-bold text-green-400">₹{result.netEarnings}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              {Object.entries(result.breakdown).filter(([k]) => k !== "subtotal").map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="text-white font-medium">₹{val}</span>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
                <span className="text-white font-bold">Total</span>
                <span className="text-green-400 font-bold">₹{result.netEarnings}</span>
              </div>
            </div>

            <div className="mt-3 bg-blue-500/10 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-400">Effective rate: ₹{result.effectiveRatePerKm}/km</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Award className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Incentives & Milestones</h3>
              <p className="text-xs text-gray-400">Weekly & monthly bonus targets</p>
            </div>
          </div>
          <button onClick={fetchIncentives} className="text-xs text-primary hover:underline">Load</button>
        </div>

        {incentives && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">{incentives.last30Days?.deliveries}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Deliveries (30d)</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                <p className="text-xl font-bold text-green-400">₹{incentives.last30Days?.totalEarnings}</p>
                <p className="text-[10px] text-green-400 uppercase tracking-wider">Total Earnings</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">{incentives.last30Days?.avgEarningsPerDay}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Per Day Avg</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Milestone Targets</p>
              <div className="space-y-2">
                {incentives.incentiveTiers?.map((tier, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      {tier.achieved ? (
                        <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                      ) : (
                        <span className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs">{i + 1}</span>
                      )}
                      <span className="text-sm text-gray-300">{tier.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${tier.achieved ? "text-green-400" : "text-gray-400"}`}>
                      +₹{tier.bonus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {incentives.nextMilestone && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm text-yellow-400 font-bold mb-1">Next Milestone</p>
                <p className="text-sm text-white">Complete {incentives.nextMilestone.label} to earn ₹{incentives.nextMilestone.bonus} bonus</p>
                <p className="text-xs text-gray-400 mt-1">{incentives.nextMilestone.remaining} more deliveries needed</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverEarningsCalculator;