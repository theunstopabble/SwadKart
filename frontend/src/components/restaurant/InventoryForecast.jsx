import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, TrendingDown, CheckCircle, Loader2 } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";

const InventoryForecast = () => {
  const [forecast, setForecast] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetchForecast(ac.signal);
    return () => ac.abort();
  }, []);

  const fetchForecast = async (signal) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/inventory-forecast/forecast`, { credentials: "include", signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForecast(data.forecasts || []);
      setSummary(data.summary);
      setRecommendations(data.restockRecommendations || []);
    } catch (_err) { if (_err.name !== "AbortError") toast.error("Failed to load inventory forecast"); void _err; } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "healthy": return { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: <CheckCircle size={14} /> };
      case "low": return { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", icon: <AlertTriangle size={14} /> };
      case "critical": return { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: <AlertTriangle size={14} /> };
      case "out_of_stock": return { bg: "bg-red-600/10", border: "border-red-600/20", text: "text-red-600", icon: <TrendingDown size={14} /> };
      default: return { bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400", icon: <Package size={14} /> };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/10 rounded-xl">
            <Package className="text-orange-400" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Inventory Forecasting</h3>
            <p className="text-xs text-gray-400">Stock predictions & reorder alerts</p>
          </div>
          <button onClick={() => fetchForecast()} disabled={loading} className="bg-primary hover:bg-primary/80 text-white px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-bold min-w-[44px] flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={14} /> : "Refresh"}
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-6">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{summary.totalProducts}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
            </div>
            <div className="bg-red-600/10 rounded-xl p-3 text-center border border-red-600/20">
              <p className="text-xl font-bold text-red-400">{summary.outOfStock}</p>
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Out of Stock</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
              <p className="text-xl font-bold text-red-400">{summary.critical}</p>
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Critical</p>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
              <p className="text-xl font-bold text-yellow-400">{summary.low}</p>
              <p className="text-[10px] text-yellow-400 uppercase tracking-wider">Low Stock</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/20">
              <p className="text-xl font-bold text-green-400">{summary.healthy}</p>
              <p className="text-[10px] text-green-400 uppercase tracking-wider">Healthy</p>
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm font-bold text-red-400 mb-3 uppercase tracking-wider">⚠️ Urgent Restock Required</p>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-800 rounded-lg px-4 py-2.5 gap-1 sm:gap-0">
                  <span className="text-sm text-white">{rec.product}</span>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs">
                    <span className="text-gray-400">Stock: {rec.currentStock}</span>
                    <span className="font-bold text-red-400">+{rec.recommendedQty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {forecast.length > 0 && (
          <>
            {/* MOBILE: vertical cards (hidden on md+) */}
            <div className="md:hidden space-y-3">
              {forecast.map((item) => {
                const style = getStatusStyle(item.status);
                return (
                  <div key={item.productId} className="bg-gray-800/50 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{item.category}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                        {style.icon}
                        {item.status === "out_of_stock" ? "Out" : item.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-bold text-white">{item.currentStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Daily Demand</span>
                        <span className="font-bold text-gray-300">{item.avgDailyDemand}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Days Until Stockout</span>
                        <span className={`font-bold ${item.daysUntilStockout === "∞" ? "text-green-400" : parseInt(item.daysUntilStockout) <= 2 ? "text-red-400" : parseInt(item.daysUntilStockout) <= 5 ? "text-yellow-400" : "text-gray-300"}`}>
                          {item.daysUntilStockout === "∞" ? "∞" : `${item.daysUntilStockout}d`}
                        </span>
                      </div>
                      {item.suggestedReorderQty > 0 && (
                        <div className="flex justify-between pt-1.5 border-t border-gray-800">
                          <span className="text-gray-400 font-bold">Reorder</span>
                          <span className="font-bold text-primary">+{item.suggestedReorderQty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* DESKTOP: table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-500 tracking-widest border-b border-gray-800">
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Current Stock</th>
                    <th className="pb-3 pr-4">Avg Daily Demand</th>
                    <th className="pb-3 pr-4">Days Until Stockout</th>
                    <th className="pb-3 pr-4">Suggested Reorder</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((item) => {
                    const style = getStatusStyle(item.status);
                    return (
                      <tr key={item.productId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 pr-4">
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="text-[10px] text-gray-500">{item.category}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-bold text-white">{item.currentStock}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-gray-300">{item.avgDailyDemand}/day</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-sm font-bold ${item.daysUntilStockout === "∞" ? "text-green-400" : parseInt(item.daysUntilStockout) <= 2 ? "text-red-400" : parseInt(item.daysUntilStockout) <= 5 ? "text-yellow-400" : "text-gray-300"}`}>
                            {item.daysUntilStockout === "∞" ? "∞" : `${item.daysUntilStockout} days`}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {item.suggestedReorderQty > 0 && (
                            <span className="text-sm font-bold text-primary">+{item.suggestedReorderQty}</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                            {style.icon}
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryForecast;