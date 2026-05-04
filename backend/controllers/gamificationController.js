import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

const BADGES = [
  { name: "First Bite", description: "Placed your first order", icon: "🍔", orders: 1 },
  { name: "Foodie", description: "Ordered 10 times", icon: "🍕", orders: 10 },
  { name: "Explorer", description: "Ordered 25 times", icon: "🍣", orders: 25 },
  { name: "Loyalist", description: "Ordered 50 times", icon: "👑", orders: 50 },
  { name: "Week Warrior", description: "7-day ordering streak", icon: "🔥", streak: 7 },
  { name: "Month Master", description: "30-day ordering streak", icon: "🏆", streak: 30 },
];

/**
 * Update user streak on order delivery
 * Call this when order status changes to "delivered"
 */
export const updateOrderStreak = async (userId) => {
  try {
    const user = await User.findById(userId).select("orderStreak longestStreak lastOrderDate badges");
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = 1;
    if (user.lastOrderDate) {
      const lastDate = new Date(user.lastOrderDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already ordered today, don't increment
        newStreak = user.orderStreak;
      } else if (diffDays === 1) {
        // Consecutive day
        newStreak = user.orderStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(user.longestStreak, newStreak);

    // Check for streak badges
    const currentBadgeNames = user.badges.map((b) => b.name);
    const newBadges = [];

    for (const badge of BADGES) {
      if (badge.streak && newStreak >= badge.streak && !currentBadgeNames.includes(badge.name)) {
        newBadges.push({
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          earnedAt: new Date(),
        });
      }
    }

    await User.findByIdAndUpdate(userId, {
      orderStreak: newStreak,
      longestStreak,
      lastOrderDate: today,
      $push: { badges: { $each: newBadges } },
    });

    return { streak: newStreak, newBadges };
  } catch (error) {
    console.error("Gamification streak update error:", error.message);
    return null;
  }
};

/**
 * Check order count badges (call periodically or on order creation)
 */
export const checkOrderCountBadges = async (userId, totalOrders) => {
  try {
    const user = await User.findById(userId).select("badges");
    if (!user) return;

    const currentBadgeNames = user.badges.map((b) => b.name);
    const newBadges = [];

    for (const badge of BADGES) {
      if (badge.orders && totalOrders >= badge.orders && !currentBadgeNames.includes(badge.name)) {
        newBadges.push({
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          earnedAt: new Date(),
        });
      }
    }

    if (newBadges.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $push: { badges: { $each: newBadges } },
      });
    }

    return newBadges;
  } catch (error) {
    console.error("Badge check error:", error.message);
    return [];
  }
};

// @desc    Get user's gamification stats
// @route   GET /api/v1/gamification/stats
// @access  Private
export const getGamificationStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "orderStreak longestStreak lastOrderDate badges"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    streak: user.orderStreak,
    longestStreak: user.longestStreak,
    lastOrderDate: user.lastOrderDate,
    badges: user.badges,
    totalBadges: user.badges.length,
    nextBadge: BADGES.find(
      (b) =>
        (b.streak && user.orderStreak < b.streak) ||
        (b.orders && !user.badges.some((ub) => ub.name === b.name))
    ) || null,
  });
});

