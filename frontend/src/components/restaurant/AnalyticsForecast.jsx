import React, { useState } from "react";
import { TrendingUp, BarChart2, Package, AlertTriangle } from "lucide-react";
import { BASEURL } from "../../config";
import { toast } from "react-hot-toast";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const AnalyticsForecast = () => {
  const [projection, setProjection] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [demand, setDemand] = useState(null);
  void setDemand;
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("30");

  const fetchRevenueProjection = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/analytics-forecast/revenue-projection?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProjection(data);
    } catch (_err) {
      void _err;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderForecast = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASEURL}/api/v1/analytics-forecast/order-forecast?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForecast(data);
    } catch (_err) {
      toast.error("Failed to load order forecast");
    } finally {
      setLoading(false);
    }
  };

  const renderDayVolume = () => {
    if (!forecast?.dayVolume) return null;
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={forecast.dayVolume}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="day" stroke="#4b5563" fontSize={10} />
          <YAxis stroke="#4b5563" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: "#111827", borderRadius: "12px", border: "1px solid #374151" }} />
          <Bar dataKey="orders" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-xl">
            <TrendingUp className="text-primary" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Revenue Projection</h3>
            <p className="text-xs text-gray-400">30-day historical analysis with 7-day forecast</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-white">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
            <button onClick={fetchRevenueProjection} className="bg-primary hover:bg-primary/80 text-white px-4 py-1 rounded-lg text-xs font-bold">
              {loading ? "..." : "Load"}
            </button>
          </div>
        </div>

        {projection && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">₹{projection.totalRevenue?.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Revenue</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                <p className="text-xl font-bold text-green-400">₹{projection.weeklyProjection?.toLocaleString()}</p>
                <p className="text-[10px] text-green-400 uppercase tracking-wider">7-Day Projected</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 text-center border border-blue-500/20">
                <p className="text-xl font-bold text-blue-400">₹{projection.monthlyProjection?.toLocaleString()}</p>
                <p className="text-[10px] text-blue-400 uppercase tracking-wider">30-Day Projected</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">₹{projection.avgOrderValue?.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Order</p>
              </div>
            </div>

            {projection.dailyRevenue?.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projection.dailyRevenue}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="_id" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", borderRadius: "12px", border: "1px solid #374151" }} formatter={(v) => [`₹${v}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {projection.projected7Days?.length > 0 && (
              <div className="mt-4 bg-gray-800 rounded-xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">7-Day Forecast</p>
                <div className="flex gap-2 overflow-x-auto">
                  {projection.projected7Days.map((day, i) => (
                    <div key={i} className="flex-shrink-0 bg-gray-700 rounded-xl p-3 text-center min-w-[100px]">
                      <p className="text-[10px] text-gray-400">{day.date?.split("-").slice(1).join("/")}</p>
                      <p className="text-sm font-bold text-primary">₹{day.projectedRevenue?.toLocaleString()}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        day.confidence === "high" ? "bg-green-500/20 text-green-400" :
                        day.confidence === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>{day.confidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <BarChart2 className="text-blue-400" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Order Volume Forecast</h3>
            <p className="text-xs text-gray-400">Hourly patterns and day-of-week analysis</p>
          </div>
          <button onClick={fetchOrderForecast} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-xs font-bold">
            {loading ? "..." : "Load"}
          </button>
        </div>

        {forecast && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-white">{forecast.avgDailyOrders}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Daily Orders</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-400">{forecast.projectedNext7Days}</p>
              <p className="text-[10px] text-green-400 uppercase tracking-wider">Next 7 Days</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-blue-400">{forecast.projectedNext30Days}</p>
              <p className="text-[10px] text-blue-400 uppercase tracking-wider">Next 30 Days</p>
            </div>
          </div>
        )}

        {forecast?.dayVolume && renderDayVolume()}

        {forecast?.peakHours?.length > 0 && (
          <div className="mt-4 flex gap-4">
            <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <p className="text-[10px] text-green-400 uppercase tracking-wider">Peak Hours</p>
              <p className="text-sm font-bold text-green-400 mt-1">{forecast.peakHours.map((h) => `${h}:00`).join(", ")}</p>
            </div>
            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Off-Peak Hours</p>
              <p className="text-sm font-bold text-red-400 mt-1">{forecast.offPeakHours.map((h) => `${h}:00`).join(", ")}</p>
            </div>
          </div>
        )}
      </div>

      {demand && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Package className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top Products</h3>
              <p className="text-xs text-gray-400">Best performing items by demand</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-gray-500 tracking-widest border-b border-gray-800">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Sold</th>
                  <th className="pb-3 pr-4">Revenue</th>
                  <th className="pb-3">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {demand.topProducts?.map((p, i) => (
                  <tr key={p.productId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 pr-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                        i === 1 ? "bg-gray-400/20 text-gray-300" :
                        i === 2 ? "bg-orange-500/20 text-orange-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium text-white">{p.name}</td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{p.quantitySold} units</td>
                    <td className="py-3 pr-4 text-sm font-bold text-green-400">₹{p.revenue?.toLocaleString()}</td>
                    <td className="py-3 text-sm text-gray-400">₹{p.avgPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsForecast;