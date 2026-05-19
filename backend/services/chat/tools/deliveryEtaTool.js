/**
 * Delivery ETA Tool — Fetches estimated delivery time and ETA updates for an order.
 *
 * Gate pattern: auth check → fetch order (by orderId or most recent active) →
 *              check special cases (Delivered, Cancelled, no ETA) → return ETA data
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import Order from "../../../models/orderModel.js";

export const toolSchema = {
  type: "function",
  function: {
    name: "get_delivery_eta",
    description: "Fetch the estimated delivery time for an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description:
            "MongoDB ObjectId of the order. If omitted, uses the most recent active order.",
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
 * Execute the delivery ETA tool.
 *
 * @param {object} params
 * @param {string} [params.orderId] - Optional specific order ID
 * @param {string|null} params.userId - Authenticated user ID
 * @returns {Promise<object>} Structured result with ETA data or error
 */
export async function execute({ orderId, userId }) {
  // Gate 1: Auth check
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to check delivery ETA.",
    };
  }

  try {
    // Build the query with a 3-second timeout via Promise.race
    let queryPromise;

    if (orderId) {
      // Fetch specific order by ID (must belong to user)
      queryPromise = Order.findOne({ _id: orderId, user: userId }).lean();
    } else {
      // Fetch most recent active order (not Delivered, not Cancelled)
      queryPromise = Order.findOne({
        user: userId,
        orderStatus: { $nin: ["Delivered", "Cancelled"] },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 3000)
    );

    const order = await Promise.race([queryPromise, timeoutPromise]);

    // Gate 2: Check existence
    if (!order) {
      return {
        success: false,
        reason: "not_found",
        message: "No active order found. You may not have any orders in progress.",
      };
    }

    // Gate 3: Check special cases based on order status

    // Special case: Order already delivered
    if (order.orderStatus === "Delivered") {
      return {
        success: false,
        reason: "order_delivered",
        message: "This order has already been delivered.",
        data: {
          deliveredAt: formatDateTime(order.deliveredAt),
        },
      };
    }

    // Special case: Order cancelled
    if (order.orderStatus === "Cancelled") {
      return {
        success: false,
        reason: "order_cancelled",
        message: "This order was cancelled. No delivery ETA is applicable.",
      };
    }

    // Special case: No ETA available yet
    if (!order.estimatedDeliveryAt) {
      return {
        success: false,
        reason: "eta_not_available",
        message:
          "The delivery estimate is not yet available for this order. Please check back shortly.",
      };
    }

    // Gate 4: Return ETA data
    const etaUpdates = order.etaUpdates || [];
    const latestEtaUpdate =
      etaUpdates.length > 0
        ? {
            estimatedMinutes: etaUpdates[etaUpdates.length - 1].estimatedMinutes,
            reason: etaUpdates[etaUpdates.length - 1].reason,
          }
        : null;

    return {
      success: true,
      data: {
        orderId: order._id.toString(),
        estimatedDeliveryAt: formatDateTime(order.estimatedDeliveryAt),
        latestEtaUpdate,
        deliveryStatus: order.deliveryStatus,
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
      message: "Something went wrong while fetching delivery ETA.",
    };
  }
}
