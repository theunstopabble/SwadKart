import React, { useState, useEffect } from "react";
import axios from "axios";
import { BASEURL } from "../config";
import { Flame, Award, Trophy, Loader, Star } from "lucide-react";

const Gamification = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get(
          `${BASEURL}/api/v1/gamification/stats`,
          { withCredentials: true }
        );
        setStats(data);
      } catch {
        setStats({
          currentStreak: 0,
          longestStreak: 0,
          totalOrders: 0,
          badges: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <Loader className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  const badgeIcons = {
    first_order: <Star size={20} className="text-yellow-400" />,
    streak_3: <Flame size={20} className="text-orange-400" />,
    streak_7: <Flame size={20} className="text-red-400" />,
    streak_30: <Flame size={20} className="text-purple-400" />,
    top_10: <Trophy size={20} className="text-amber-400" />,
    explorer: <Award size={20} className="text-blue-400" />,
  };

  const badgeNames = {
    first_order: "First Bite",
    streak_3: "3-Day Streak",
    streak_7: "Week Warrior",
    streak_30: "Month Master",
    top_10: "Top 10",
    explorer: "Explorer",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-yellow-400" size={32} />
          <h1 className="text-3xl font-bold">Rewards & Streaks</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <Flame className="mx-auto text-orange-400 mb-2" size={28} />
            <div className="text-3xl font-bold">{stats.currentStreak}</div>
            <div className="text-gray-400 text-sm mt-1">Current Streak</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <Award className="mx-auto text-purple-400 mb-2" size={28} />
            <div className="text-3xl font-bold">{stats.longestStreak}</div>
            <div className="text-gray-400 text-sm mt-1">Best Streak</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <Star className="mx-auto text-yellow-400 mb-2" size={28} />
            <div className="text-3xl font-bold">{stats.totalOrders}</div>
            <div className="text-gray-400 text-sm mt-1">Total Orders</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" /> Badges Earned
          </h2>
          {stats.badges?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {stats.badges.map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700"
                >
                  {badgeIcons[badge] || <Award size={18} className="text-gray-400" />}
                  <span className="text-sm font-medium">
                    {badgeNames[badge] || badge}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">
              No badges yet. Start ordering to unlock achievements!
            </p>
          )}
        </div>

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-center text-gray-400 text-sm">
          Place an order every day to keep your streak alive and earn exclusive
          badges.
        </div>
      </div>
    </div>
  );
};

export default Gamification;
