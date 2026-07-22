import React, { useState } from "react";
import { TrendingUp, Percent, IndianRupee, Building2, Zap } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const PricingCalculator = () => {
  const [form, setForm] = useState({ basePrice: "", costPrice: "", surgeMultiplier: "1" });
  const [result, setResult] = useState(null);
  const [commissionData, setCommissionData] = useState([]);
  const [loading, setLoading] = useState(false);

  const calculateTiers = async () => {
    if (!form.basePrice || !form.costPrice) {
      toast.error("Enter base price and cost price");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/pricing-calculator/pricing-tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          basePrice: parseFloat(form.basePrice),
          costPrice: parseFloat(form.costPrice),
          surgeMultiplier: parseFloat(form.surgeMultiplier),
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setResult(data);
    } catch (_err) {
      toast.error("Failed to calculate pricing tiers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/pricing-calculator/commission-breakdown`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCommissionData(data);
    } catch (_err) {
      toast.error("Failed to load commission data");
    } finally {
      setLoading(false);
    }
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return "text-green-400 bg-green-500/10";
    if (margin >= 15) return "text-yellow-400 bg-yellow-500/10";
    return "text-red-400 bg-red-500/10";
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Pricing & Commission Calculator</h3>
            <p className="text-xs text-gray-400">Margins, tiers & platform fees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Base Price (₹)</label>
            <input
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-white text-sm focus:border-primary focus:outline-none"
              placeholder="199"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Cost Price (₹)</label>
            <input
              type="number"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-white text-sm focus:border-primary focus:outline-none"
              placeholder="80"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Surge Multiplier</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="3"
              value={form.surgeMultiplier}
              onChange={(e) => setForm({ ...form, surgeMultiplier: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-white text-sm focus:border-primary focus:outline-none"
              placeholder="1.5"
            />
          </div>
        </div>

        <button
          onClick={calculateTiers}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Current Margin</p>
                <p className={`text-xl font-bold ${getMarginColor(result.currentMargin)}`}>{result.currentMargin}%</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Current Profit</p>
                <p className="text-xl font-bold text-white">₹{result.currentProfit}</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                <p className="text-[10px] text-primary uppercase tracking-wider">Recommended</p>
                <p className="text-xl font-bold text-primary">₹{result.recommendedPrice}</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/20">
                <p className="text-[10px] text-purple-400 uppercase tracking-wider">With Surge ({result.surgeMultiplier}x)</p>
                <p className="text-xl font-bold text-purple-400">₹{result.withSurge}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Pricing Tiers</h4>
              <div className="space-y-2">
                {result.tiers.map((tier, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <span className="text-sm text-gray-300">{tier.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-white">₹{tier.price}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getMarginColor(tier.margin)}`}>
                        {tier.margin}% margin
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Building2 className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Commission Breakdown</h3>
              <p className="text-xs text-gray-400">Platform fees across restaurants</p>
            </div>
          </div>
          <button
            onClick={fetchCommissionBreakdown}
            className="text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>

        {commissionData.length > 0 ? (
          <>
            {/* MOBILE: vertical cards (hidden on md+) */}
            <div className="md:hidden space-y-3">
              {commissionData.map((item) => (
                <div key={item.restaurantId} className="bg-gray-800/50 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-2">
                  <p className="text-sm font-bold text-white">{item.restaurantName}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Orders</span>
                      <span className="font-bold text-white">{item.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Net Revenue</span>
                      <span className="font-bold text-green-400">₹{item.netRevenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Platform Fee (15%)</span>
                      <span className="font-bold text-yellow-400">₹{item.platformCommission}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-gray-800">
                      <span className="text-gray-400 font-bold">Payout</span>
                      <span className="font-bold text-white">₹{item.restaurantPayout}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* DESKTOP: table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-500 tracking-widest border-b border-gray-800">
                    <th className="pb-3 pr-4">Restaurant</th>
                    <th className="pb-3 pr-4">Orders</th>
                    <th className="pb-3 pr-4">Net Revenue</th>
                    <th className="pb-3 pr-4">Platform Fee (15%)</th>
                    <th className="pb-3">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionData.map((item) => (
                    <tr key={item.restaurantId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 pr-4 text-sm font-medium text-white">{item.restaurantName}</td>
                      <td className="py-3 pr-4 text-sm text-gray-300">{item.totalOrders}</td>
                      <td className="py-3 pr-4 text-sm font-bold text-green-400">₹{item.netRevenue}</td>
                      <td className="py-3 pr-4 text-sm text-yellow-400">₹{item.platformCommission}</td>
                      <td className="py-3 text-sm font-bold text-white">₹{item.restaurantPayout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">↻ Click refresh to load commission data</p>
        )}
      </div>
    </div>
  );
};

export default PricingCalculator;