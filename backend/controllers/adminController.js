import prisma from "../config/prisma.js";

// ==========================================
// 📈 1. GET SALES STATS (For Recharts)
// ==========================================
export const getSalesStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const where = { isPaid: true, orderStatus: { not: "Cancelled" } };

    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await prisma.restaurant.findFirst({
        where: { ownerId: userId },
      });
      if (!restaurantDoc)
        return res.status(404).json({ message: "Restaurant not found." });
      where.restaurantId = restaurantDoc.id;
    }

    const paidOrders = await prisma.order.findMany({
      where,
      select: { totalPrice: true, createdAt: true },
    });

    const dateMap = {};
    for (const order of paidOrders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { sales: 0, orders: 0 };
      }
      dateMap[dateKey].sales += order.totalPrice;
      dateMap[dateKey].orders += 1;
    }

    const stats = Object.keys(dateMap)
      .sort()
      .slice(-7)
      .map((date) => ({
        _id: date,
        sales: parseFloat(dateMap[date].sales.toFixed(2)),
        orders: dateMap[date].orders,
      }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📊 2. GET DASHBOARD SUMMARY
// ==========================================
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const query = {};
    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await prisma.restaurant.findFirst({
        where: { ownerId: userId },
      });
      if (!restaurantDoc)
        return res.status(404).json({ message: "No restaurant found." });
      query.restaurantId = restaurantDoc.id;
    }

    const [allOrders, paidOrders, recentOrders, totalUsers, totalRestaurants] =
      await Promise.all([
        prisma.order.findMany({
          where: query,
          select: { orderStatus: true },
        }),
        prisma.order.findMany({
          where: { ...query, isPaid: true, orderStatus: { not: "Cancelled" } },
          select: { totalPrice: true },
        }),
        prisma.order.findMany({
          where: query,
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        req.user.role === "admin" ? prisma.user.count() : 0,
        req.user.role === "admin" ? prisma.restaurant.count() : 0,
      ]);

    const totalOrders = allOrders.length;
    const totalSales = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const breakdown = {};
    for (const o of allOrders) {
      const key = o.orderStatus.toLowerCase();
      breakdown[key] = (breakdown[key] || 0) + 1;
    }

    res.json({
      totalOrders,
      totalSales: Number(totalSales.toFixed(2)),
      breakdown,
      recentOrders,
      totalRestaurants,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: "Stats fetching failed." });
  }
};

// ==========================================
// 🔥 3. GET HEATMAP DATA
// ==========================================
export const getHeatmapData = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      select: { shippingAddress: true, totalPrice: true },
    });

    const heatmapData = orders
      .filter(
        (o) =>
          o.shippingAddress &&
          typeof o.shippingAddress.lat === "number" &&
          typeof o.shippingAddress.lng === "number",
      )
      .map((order) => ({
        lat: order.shippingAddress.lat,
        lng: order.shippingAddress.lng,
        weight: Math.min(order.totalPrice / 500, 1),
      }));

    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ message: "Heatmap data fetch failed." });
  }
};

// ==========================================
// 🛡️ 4. USER MANAGEMENT (Admin)
// ==========================================
export const getAllUsersAdmin = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    const safeUsers = users.map(({ password: _, ...u }) => u);
    res.json({ users: safeUsers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user.id || req.user._id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.id === currentUserId) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const validRoles = ["user", "admin", "delivery_partner", "restaurant_owner"];
    const newRole = req.body.role;
    if (!newRole || !validRoles.includes(newRole)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
        isAdmin: newRole === "admin",
      },
    });

    const { password: _, ...safeUser } = updatedUser;
    res.json({ message: "Role updated", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleRestaurantApproval = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isVerified: !restaurant.isVerified },
    });

    res.json({
      message: `Restaurant ${updated.isVerified ? "Approved" : "Disapproved"}`,
      restaurant: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin")
      return res.status(400).json({ message: "Cannot delete Admin" });

    await prisma.restaurant.deleteMany({ where: { ownerId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
