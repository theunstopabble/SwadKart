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
// @access  Private
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
        // ✅ CRITICAL: Save Variants/Addons explicitly
        selectedVariant: x.selectedVariant || null,
        selectedAddons: x.selectedAddons || [],
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
      // Logic: Notify the owner of the restaurant for the first item
      // In a multi-vendor cart, this would need a loop, but assuming single-vendor per order for now.
      // Note: 'restaurant' in OrderItem refers to the User ID of the owner/vendor.
      const restaurantOwnerId = createdOrder.orderItems[0].restaurant;

      if (restaurantOwnerId) {
        req.io
          .to(restaurantOwnerId.toString())
          .emit("newOrderReceived", createdOrder);
        console.log(
          `🔔 Socket: New order alert sent to owner ${restaurantOwnerId}`
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
// @desc    Get order details
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("deliveryPartner", "name phone")
      // ✅ CRITICAL: Populate product details so name/image are available even if not saved in orderItems directly
      // Although orderItems usually saves name/image snapshot, populating ensures we have latest/fallback data
      .populate({
        path: "orderItems.product",
        select: "name image category",
      });

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
// 💳 3. UPDATE ORDER TO PAID
// ==========================================
// @desc    Update order to paid (For Online Payments)
// @route   PUT /api/v1/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      // Payment Result from Gateway (Razorpay/PayPal)
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      const updatedOrder = await order.save();

      // 🔔 Socket Notification
      if (req.io) {
        req.io
          .to(updatedOrder._id.toString())
          .emit("orderUpdated", updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚚 4. UPDATE ORDER TO DELIVERED (Specific)
// ==========================================
// @desc    Update order to delivered
// @route   PUT /api/v1/orders/:id/deliver
// @access  Private/Admin/Delivery
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.orderStatus = "Delivered";

      // If COD, mark as paid upon delivery
      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      const updatedOrder = await order.save();

      // 🔔 Socket Notification
      if (req.io) {
        req.io
          .to(updatedOrder._id.toString())
          .emit("orderUpdated", updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🛠️ 5. UPDATE ORDER STATUS (Generic)
// ==========================================
// @desc    Update order status & Trigger notifications
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin/Restaurant
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === "COD") {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    const updatedOrder = await order.save();

    // 🔔 Real-time Updates via Socket
    if (req.io) {
      req.io.to(order._id.toString()).emit("orderUpdated", updatedOrder);

      // Broadcast to delivery partners if Ready
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
// 📜 6. USER ORDER HISTORY
// ==========================================
// @desc    Get logged in user orders
// @route   GET /api/v1/orders/myorders
// @access  Private
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
// 👑 7. ADMIN: ALL ORDERS
// ==========================================
// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "id name email") // Populate User details for Admin UI
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📈 8. SALES ANALYTICS
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
      { $limit: 7 }, // Last 7 days stats
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🚫 9. CANCEL ORDER
// ==========================================
export const cancelOrder = async (req, res) => {
  const { reason } = req.body;
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Restriction: Cannot cancel if already dispatched
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
