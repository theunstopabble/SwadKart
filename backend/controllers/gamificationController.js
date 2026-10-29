import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

const BADGES = [
  { name: "First Bite", description: "Placed your first order", icon: "🍔", orders: 1 },
  { name: "Foodie", description: "Ordered 10 times", icon: "🍕", orders: 10 },
  { name: "Explorer", description: "Ordered 25 times", icon: "🍣", orders: 25 },
  { name: "Loyalist", description: "Ordered 50 times", icon: "👑", orders: 50 },
  { name: "Week Warrior", description: "7-day ordering streak", icon: "🔥", streak: 7 },
  { name: "Month Master", description: "30-day ordering streak", icon: "🏆", streak: 30 },
];

export const updateOrderStreak = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { orderStreak: true, longestStreak: true, lastOrderDate: true, badges: true },
    });
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = 1;
    if (user.lastOrderDate) {
      const lastDate = new Date(user.lastOrderDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        newStreak = user.orderStreak;
      } else if (diffDays === 1) {
        newStreak = user.orderStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(user.longestStreak || 0, newStreak);
    const badges = Array.isArray(user.badges) ? user.badges : [];
    const currentBadgeNames = badges.map((b) => b.name);
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

    const allBadges = [...badges, ...newBadges];

    await prisma.user.update({
      where: { id: userId },
      data: {
        orderStreak: newStreak,
        longestStreak,
        lastOrderDate: today,
        badges: allBadges,
      },
    });

    return { streak: newStreak, newBadges };
  } catch (error) {
    console.error("Gamification streak update error:", error.message);
    return null;
  }
};

export const checkOrderCountBadges = async (userId, totalOrders) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });
    if (!user) return;

    const badges = Array.isArray(user.badges) ? user.badges : [];
    const currentBadgeNames = badges.map((b) => b.name);
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
      await prisma.user.update({
        where: { id: userId },
        data: { badges: [...badges, ...newBadges] },
      });
    }

    return newBadges;
  } catch (error) {
    console.error("Badge check error:", error.message);
    return [];
  }
};

export const getGamificationStats = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      orderStreak: true,
      longestStreak: true,
      lastOrderDate: true,
      badges: true,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const badges = Array.isArray(user.badges) ? user.badges : [];

  res.json({
    streak: user.orderStreak,
    longestStreak: user.longestStreak,
    lastOrderDate: user.lastOrderDate,
    badges,
    totalBadges: badges.length,
    nextBadge:
      BADGES.find(
        (b) =>
          (b.streak && user.orderStreak < b.streak) ||
          (b.orders && !badges.some((ub) => ub.name === b.name)),
      ) || null,
  });
});
