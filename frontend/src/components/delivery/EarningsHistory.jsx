import React from "react";
import { IndianRupee, TrendingUp, CheckCircle } from "lucide-react";

const EarningsHistory = ({ tasks }) => {
  // Filter only delivered orders
  const completedTasks = tasks.filter((t) => t.isDelivered);

  // Calculate total earnings
  const totalEarnings = completedTasks.reduce(
    (acc, t) => acc + t.totalPrice,
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-black uppercase italic border-l-4 border-green-500 pl-3">
        Payout <span className="text-green-500">History</span>
      </h3>

      {/* Earnings Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-gray-900 p-6 rounded-3xl border border-green-500/20 shadow-lg">
          <IndianRupee className="text-green-500 mb-3" size={24} />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Total Earnings
          </p>
          <h3 className="text-3xl font-black text-white mt-1">
            ₹{totalEarnings.toFixed(2)}
          </h3>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-gray-900 p-6 rounded-3xl border border-blue-500/20 shadow-lg">
          <CheckCircle className="text-blue-500 mb-3" size={24} />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Completed Orders
          </p>
          <h3 className="text-3xl font-black text-white mt-1">
            {completedTasks.length}
          </h3>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-6">
        <h4 className="text-sm font-bold mb-4 flex items-center gap-2 opacity-60">
          <TrendingUp size={16} /> Recent Deliveries
        </h4>

        {completedTasks.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-gray-600 italic uppercase font-bold tracking-widest">
              No payouts settled yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedTasks.slice(0, 10).map((task) => (
              <div
                key={task._id}
                className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-gray-800/50 hover:border-green-500/30 transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-white uppercase font-mono group-hover:text-green-400 transition-colors">
                    #{task._id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                    {new Date(task.deliveredAt).toLocaleDateString()} |{" "}
                    {new Date(task.deliveredAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-green-400 font-black text-lg">
                    +₹{task.totalPrice}
                  </span>
                  <p className="text-[8px] text-gray-600 uppercase font-black">
                    Settled
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsHistory;
