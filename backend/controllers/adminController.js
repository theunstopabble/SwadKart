import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// ==========================================
// 📈 1. GET SALES STATS (For Recharts)
// ==========================================
export const getSalesStats = async (req, res) => {
  try {
    let matchQuery = { isPaid: true, orderStatus: { $ne: "Cancelled" } };

    // Filter for restaurant owners to see only their data
    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id });
      if (!restaurantDoc)
        return res.status(404).json({ message: "Restaurant not found." });
      matchQuery["orderItems.restaurant"] = restaurantDoc._id;
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }, // Last 7 days trend
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📊 2. GET DASHBOARD SUMMARY (Optimized)
// ==========================================
export const getDashboardStats = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "restaurant_owner") {
      const restaurantDoc = await Restaurant.findOne({ owner: req.user._id });
      if (!restaurantDoc)
        return res.status(404).json({ message: "No restaurant found." });
      query = { "orderItems.restaurant": restaurantDoc._id };
    }

    // 🔥 Optimized: Single database call for all counts using $facet
    const statsData = await Order.aggregate([
      { $match: query },
      {
        $facet: {
          totalOrders: [{ $count: "count" }],
          totalSales: [
            { $match: { isPaid: true, orderStatus: { $ne: "Cancelled" } } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } },
          ],
          breakdown: [{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }],
        },
      },
    ]);

    // Format breakdown object — use dynamic keys from aggregation result
    const breakdown = {};
    statsData[0].breakdown.forEach((item) => {
      const key = item._id.toLowerCase();
      breakdown[key] = item.count;
    });

    const recentOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email");

    const totalUsers =
      req.user.role === "admin" ? await User.countDocuments() : 0;
    const totalRestaurants =
      req.user.role === "admin" ? await Restaurant.countDocuments() : 0;

    res.json({
      totalOrders: statsData[0].totalOrders[0]?.count || 0,
      totalSales: Number((statsData[0].totalSales[0]?.total || 0).toFixed(2)),
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
// 🔥 3. GET HEATMAP DATA (New)
// ==========================================
export const getHeatmapData = async (req, res) => {
  try {
    const filter = {
      "shippingAddress.lat": { $exists: true, $ne: null },
      "shippingAddress.lng": { $exists: true, $ne: null },
    };

    // (restaurant_owner guard removed — route is admin-only)

    const orders = await Order.find(filter).select(
      "shippingAddress.lat shippingAddress.lng totalPrice"
    );

    const heatmapData = orders.map((order) => ({
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
// 🛡️ 3. USER MANAGEMENT (Admin)
// ==========================================
// TODO: Wire `getAllUsersAdmin` to a route (e.g. GET /api/v1/admin/users)
export const getAllUsersAdmin = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// TODO: Wire `updateUserRole` to a route (e.g. PUT /api/v1/admin/users/:id/role)
export const updateUserRole = async (req, res) => {
  try {
    const userId = sanitizeObjectId(req.params.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const validRoles = ["user", "admin", "delivery_partner", "restaurant_owner"];
    const newRole = req.body.role;
    if (!newRole || !validRoles.includes(newRole)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }

    user.role = newRole;
    user.isAdmin = user.role === "admin";

    const updatedUser = await user.save();
    res.json({ message: "Role updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🏪 4. RESTAURANT APPROVAL (New)
// ==========================================
// TODO: Wire `toggleRestaurantApproval` to a route (e.g. PUT /api/v1/admin/restaurants/:id/approve)
export const toggleRestaurantApproval = async (req, res) => {
  try {
    const restaurantId = sanitizeObjectId(req.params.id);
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(404).json({ message: "Restaurant not found" });

    restaurant.isVerified = !restaurant.isVerified;
    await restaurant.save();

    res.json({
      message: `Restaurant ${restaurant.isVerified ? "Approved" : "Disapproved"
        }`,
      restaurant,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// TODO: Wire `deleteUser` to a route (e.g. DELETE /api/v1/admin/users/:id)
export const deleteUser = async (req, res) => {
  try {
    const userId = sanitizeObjectId(req.params.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin")
      return res.status(400).json({ message: "Cannot delete Admin" });

    await Order.updateMany(
      { user: user._id },
      { $set: { deletedUserName: user.name, user: null } }
    );
    await Restaurant.deleteMany({ owner: user._id });
    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
