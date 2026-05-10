import React, { useState } from "react";
import { Award, Coins, Star, TrendingUp, Gift } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const RewardCalculator = () => {
  const [form, setForm] = useState({ orderAmount: "" });
  const [redeemForm, setRedeemForm] = useState({ coins: "", orderAmount: "" });
  const [earnResult, setEarnResult] = useState(null);
  const [redeemResult, setRedeemResult] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTiers = async () => {
    try {
      const res = await fetch(`${BASEURL}/api/v1/rewards-calculator/tiers`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTiers(data);
    } catch {
      toast.error("Failed to load tiers");
    }
  };

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/rewards-calculator/breakdown`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBreakdown(data);
    } catch {
      toast.error("Failed to load reward breakdown");
    } finally {
      setLoading(false);
    }
  };

  useState(() => { fetchTiers(); fetchBreakdown(); }, []);

  const calculateEarnings = async () => {
    if (!form.orderAmount) { toast.error("Enter order amount"); return; }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/rewards-calculator/earn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderAmount: parseFloat(form.orderAmount) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEarnResult(data);
    } catch {
      toast.error("Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const calculateRedemption = async () => {
    if (!redeemForm.coins || !redeemForm.orderAmount) { toast.error("Enter coins and order amount"); return; }
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/rewards-calculator/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coins: parseInt(redeemForm.coins),
          orderAmount: parseFloat(redeemForm.orderAmount),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Redemption failed");
        return;
      }
      const data = await res.json();
      setRedeemResult(data);
    } catch {
      toast.error("Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (name) => {
    switch (name) {
      case "Bronze": return { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", glow: "shadow-orange-500/20" };
      case "Silver": return { bg: "bg-gray-400/10", border: "border-gray-400/20", text: "text-gray-300", glow: "shadow-gray-400/20" };
      case "Gold": return { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", glow: "shadow-yellow-500/20" };
      case "Platinum": return { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", glow: "shadow-purple-500/20" };
      default: return { bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400", glow: "shadow-gray-500/20" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 rounded-xl">
            <Coins className="text-yellow-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Coin Earning Calculator</h3>
            <p className="text-xs text-gray-400">Calculate SwadCoins earned per order</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Order Amount (₹)</label>
            <input type="number" value={form.orderAmount} onChange={(e) => setForm({ ...form, orderAmount: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="350" />
          </div>
        </div>

        <button onClick={calculateEarnings} disabled={loading} className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {loading ? "Calculating..." : "Calculate Coins Earned"}
        </button>

        {earnResult && (
          <div className="mt-6">
            <div className="bg-gray-800 rounded-xl p-4 text-center mb-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">You Earn</p>
              <p className="text-3xl font-black text-yellow-400">{earnResult.earnedCoins} <span className="text-sm font-normal text-yellow-400/70">coins</span></p>
              <p className="text-sm text-gray-300 mt-1">Worth ₹{earnResult.coinsValueRupees}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Base Rate</span>
                <span className="text-sm text-white">{earnResult.baseCoins} coins</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Tier Multiplier</span>
                <span className={`text-sm font-bold ${getTierColor(earnResult.tierName).text}`}>{earnResult.earningRate}x ({earnResult.tierName})</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Final Earned</span>
                <span className="text-lg font-bold text-yellow-400">{earnResult.earnedCoins} coins</span>
              </div>
            </div>
            <p className="text-xs text-center text-gray-400 mt-3">{earnResult.message}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-xl">
            <Gift className="text-green-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Coin Redemption Calculator</h3>
            <p className="text-xs text-gray-400">Calculate discount from coin redemption</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Coins to Redeem</label>
            <input type="number" value={redeemForm.coins} onChange={(e) => setRedeemForm({ ...redeemForm, coins: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Order Amount (₹)</label>
            <input type="number" value={redeemForm.orderAmount} onChange={(e) => setRedeemForm({ ...redeemForm, orderAmount: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:border-primary focus:outline-none" placeholder="350" />
          </div>
        </div>

        <button onClick={calculateRedemption} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {loading ? "Calculating..." : "Calculate Redemption"}
        </button>

        {redeemResult && (
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1">Discount Earned</p>
            <p className="text-2xl font-black text-green-400">₹{redeemResult.coinsValueRupees}</p>
            <p className="text-xs text-green-400/70 mt-1">{redeemResult.coinsRedeemed} coins → {redeemResult.discountPercent}% off</p>
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Final Order Amount</span><span className="font-bold">₹{redeemResult.finalOrderAmount}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Platform Fee (15%)</span><span>₹{redeemResult.platformFee}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {tiers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Award className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Loyalty Tiers</h3>
              <p className="text-xs text-gray-400">SwadCoins tier system overview</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {tiers.map((tier) => {
              const colors = getTierColor(tier.name);
              return (
                <div key={tier.name} className={`${colors.bg} border ${colors.border} rounded-xl p-4 text-center`}>
                  <div className="text-2xl mb-2">●</div>
                  <h4 className={`text-sm font-bold ${colors.text}`}>{tier.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">{tier.minCoins}+ coins</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-gray-300">{tier.earningRate}x earning</p>
                    <p className="text-[10px] text-gray-300">₹{tier.redeemRate * 100}/100 coins</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    {tier.perks.slice(0, 2).map((perk, i) => (
                      <p key={i} className="text-[10px] text-gray-400">• {perk}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {breakdown && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Your Reward Summary</h3>
            <button onClick={fetchBreakdown} className="text-xs text-primary hover:underline">Refresh</button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-yellow-400">{breakdown.currentCoins}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">SwadCoins</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-400">₹{breakdown.totalCoinsEarned * 0.1}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Earned</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-blue-400">{breakdown.recentOrders30Days}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Orders (30d)</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Recent Transactions</p>
            {breakdown.coinTransactions?.map((tx, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <div>
                  <p className="text-sm text-gray-300">{tx.description}</p>
                  <p className="text-[10px] text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === "Credit" ? "text-green-400" : "text-red-400"}`}>
                  {tx.type === "Credit" ? "+" : "-"}{Math.abs(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardCalculator;