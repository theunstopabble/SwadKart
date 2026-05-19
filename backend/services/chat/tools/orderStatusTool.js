/**
 * Order Status Tool — Fetches order status and details for the authenticated user.
 *
 * Gate pattern: auth check → fetch order (by orderId or most recent) → return structured response
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import Order from "../../../models/orderModel.js";

export const toolSchema = {
  type: "function",
  function: {
    name: "get_order_status",
    description: "Fetch the status and details of a user's order.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description:
            "MongoDB ObjectId of a specific order. If omitted, returns the most recent order.",
        },
      },
      required: [],
    },
  },
};

/**
 * Format a Date object as a human-readable date-time string.
 * @param {Date|null} date
 * @returns {string|null}
 */
function formatDateTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Execute the order status tool.
 *
 * @param {object} params
 * @param {string} [params.orderId] - Optional specific order ID
 * @param {string|null} params.userId - Authenticated user ID
 * @returns {Promise<object>} Structured result with order details or error
 */
export async function execute({ orderId, userId }) {
  // Gate 1: Auth check
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to check your order status.",
    };
  }

  try {
    // Build the query with a 3-second timeout via Promise.race
    let queryPromise;

    if (orderId) {
      // Gate 2a: Fetch specific order by ID (must belong to user)
      queryPromise = Order.findOne({ _id: orderId, user: userId }).lean();
    } else {
      // Gate 2b: Fetch most recent order by createdAt descending
      queryPromise = Order.findOne({ user: userId })
        .sort({ createdAt: -1 })
        .lean();
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 3000)
    );

    const order = await Promise.race([queryPromise, timeoutPromise]);

    // Gate 3: Check existence
    if (!order) {
      if (orderId) {
        return {
          success: false,
          reason: "not_found",
          message: "Order not found or does not belong to your account.",
        };
      }
      return {
        success: false,
        reason: "no_orders",
        message: "You don't have any orders yet.",
      };
    }

    // Build structured response
    const orderItems = (order.orderItems || []).map((item) => ({
      name: item.name,
      quantity: item.qty,
    }));

    return {
      success: true,
      data: {
        orderId: order._id.toString(),
        orderStatus: order.orderStatus,
        deliveryStatus: order.deliveryStatus,
        estimatedDeliveryAt: formatDateTime(order.estimatedDeliveryAt),
        createdAt: formatDateTime(order.createdAt),
        totalPrice: order.totalPrice,
        orderItems,
      },
    };
  } catch (err) {
    if (err.message === "timeout") {
      return {
        success: false,
        reason: "timeout",
        message: "Service temporarily unavailable. Please try again.",
      };
    }
    return {
      success: false,
      reason: "internal_error",
      message: "Something went wrong while fetching your order status.",
    };
  }
}
