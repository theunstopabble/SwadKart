import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
import Coupon from "../models/couponModel.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../utils/emailTemplates.js";

// ==========================================
// 🛒 1. CREATE NEW ORDER
// ==========================================
// @desc    Create new order & Notify Restaurant
// @route   POST /api/v1/orders
export const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    couponCode,
    couponDiscount,
  } = req.body;

  try {
    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: "No order items detected." });
    }

    // 🛡️ Generate a 4-digit OTP for secure delivery verification
    const deliveryOTP = Math.floor(1000 + Math.random() * 9000);

    const order = new Order({
      orderItems: orderItems.map((x) => ({
        ...x,
        product: x.product,
        restaurant: x.restaurant,
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      couponCode,
      couponDiscount,
      deliveryOTP, // Saved for later verification
    });

    const createdOrder = await order.save();

    // 🎫 Update Coupon Usage Log
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $addToSet: { usedBy: req.user._id } }
      );
    }

    // 🔔 REAL-TIME SOCKET: Notify Restaurant Owner immediately
    if (req.io) {
      const restaurantId = createdOrder.orderItems[0].restaurant;
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant && restaurant.owner) {
        req.io
          .to(restaurant.owner.toString())
          .emit("newOrderReceived", createdOrder);
        console.log(
          `🔔 Socket: New order alert sent to owner ${restaurant.owner}`
        );
      }
    }

    // 📧 Email notification for COD Orders
    if (paymentMethod === "COD") {
      try {
        await sendEmail({
          email: req.user.email,
          subject: `SwadKart: Order Confirmed! ✅ #${createdOrder._id
            .toString()
            .slice(-6)}`,
          html: getOrderConfirmationTemplate(createdOrder, false),
        });
      } catch (e) {
        console.error("Email Service Error:", e.message);
      }
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🔍 2. GET ORDER BY ID
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone");

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: "Order not found in records." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🛠️ 3. UPDATE ORDER STATUS
// ==========================================
// @desc    Update order status & Trigger notifications
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      // Auto-pay on delivery if COD to sync finances
      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();

    // 🔔 Real-time Updates via Socket
    if (req.io) {
      // Notify the specific user room
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);

      // Broadcast to all delivery partners if status is "Ready"
      if (status === "Ready") {
        req.io.emit("newDeliveryTask", updatedOrder);
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📈 4. SALES ANALYTICS (Dashboard)
// ==========================================
export const getSalesStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }, // Last 7 days stats for the chart
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📜 5. USER ORDER HISTORY
// ==========================================
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚫 6. CANCEL ORDER
// ==========================================
export const cancelOrder = async (req, res) => {
  const { reason } = req.body;
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Restriction: Cannot cancel if already dispatched or delivered
    const restrictedStatuses = ["Out for Delivery", "Delivered"];
    if (restrictedStatuses.includes(order.orderStatus)) {
      return res
        .status(400)
        .json({ message: "Order cannot be cancelled at this stage." });
    }

    order.orderStatus = "Cancelled";
    order.cancellationReason = reason || "Cancelled by User";

    const updatedOrder = await order.save();

    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 7. ADMIN: ALL ORDERS
// ==========================================
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "id name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
