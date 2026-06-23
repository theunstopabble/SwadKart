/**
 * Order Cancel Tool — Cancels an order if within the cancellation window.
 *
 * Gate pattern: auth check → fetch order → validate cancellation eligibility → atomic update
 *
 * Cancellation eligibility:
 * - Order is eligible if: (current time − createdAt ≤ 5 minutes) OR (orderStatus ∈ {Placed, Preparing})
 * - Orders with status in {Out for Delivery, Delivered, Cancelled} are ALWAYS ineligible
 * - If order status is "Ready" AND placed more than 5 minutes ago → cancellation_window_expired
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

import Order from "../../../models/orderModel.js";

export const toolSchema = {
  type: "function",
  function: {
    name: "cancel_order",
    description: "Cancel an order if within the cancellation window.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description:
            "MongoDB ObjectId of the order to cancel. If omitted, targets the most recent order.",
        },
      },
      required: [],
    },
  },
};

/**
 * Terminal statuses that can never be cancelled regardless of time.
 */
const NON_CANCELLABLE_STATUSES = ["Out for Delivery", "Delivered", "Cancelled"];

/**
 * Statuses that are always eligible for cancellation (regardless of time window).
 */
const ALWAYS_ELIGIBLE_STATUSES = ["Placed", "Preparing"];

/**
 * Maximum cancellation window in milliseconds (5 minutes).
 */
const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;

/**
 * Timeout for the write operation in milliseconds (5 seconds).
 */
const WRITE_TIMEOUT_MS = 5000;

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
 * Execute the order cancel tool.
 *
 * @param {object} params
 * @param {string} [params.orderId] - Optional specific order ID
 * @param {string|null} params.userId - Authenticated user ID
 * @returns {Promise<object>} Structured result with cancellation status or error
 */
export async function execute({ orderId, userId }) {
  // Gate 1: Auth check
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to cancel an order.",
    };
  }

  try {
    // Gate 2: Fetch order
    let fetchPromise;

    if (orderId) {
      fetchPromise = Order.findOne({ _id: orderId, user: userId }).lean();
    } else {
      fetchPromise = Order.findOne({ user: userId })
        .sort({ createdAt: -1 })
        .lean();
    }

    let fetchTimer;
    const fetchTimeout = new Promise((_, reject) => {
      fetchTimer = setTimeout(() => reject(new Error("timeout")), WRITE_TIMEOUT_MS);
    });

    const order = await Promise.race([fetchPromise, fetchTimeout]).finally(() => clearTimeout(fetchTimer));

    if (!order) {
      return {
        success: false,
        reason: "not_found",
        message: "Order not found or does not belong to your account.",
      };
    }

    // Gate 3: Validate cancellation eligibility
    const currentStatus = order.orderStatus;

    // Check terminal statuses first — always ineligible
    if (NON_CANCELLABLE_STATUSES.includes(currentStatus)) {
      return {
        success: false,
        reason: "order_not_cancellable",
        message: `Order cannot be cancelled because it is already "${currentStatus}".`,
      };
    }

    // Check time window
    const now = new Date();
    const createdAt = new Date(order.createdAt);
    const elapsedMs = now.getTime() - createdAt.getTime();
    const withinTimeWindow = elapsedMs <= CANCELLATION_WINDOW_MS;

    // Check if status is always eligible
    const statusEligible = ALWAYS_ELIGIBLE_STATUSES.includes(currentStatus);

    // Eligibility: within time window OR status is Placed/Preparing
    if (!withinTimeWindow && !statusEligible) {
      // Order is in "Ready" status and past the 5-minute window
      return {
        success: false,
        reason: "cancellation_window_expired",
        message:
          "The cancellation window has expired. Orders can only be cancelled within 5 minutes of placement or while still being prepared.",
      };
    }

    // Gate 4: Atomic cancellation via findOneAndUpdate
    const cancelledAt = new Date();

    const updatePromise = Order.findOneAndUpdate(
      {
        _id: order._id,
        user: userId,
        orderStatus: { $nin: NON_CANCELLABLE_STATUSES },
      },
      {
        $set: {
          orderStatus: "Cancelled",
          cancelledAt,
          cancellationReason: "Cancelled via chatbot",
        },
      },
      { new: true }
    ).lean();

    let writeTimer;
    const writeTimeout = new Promise((_, reject) => {
      writeTimer = setTimeout(() => reject(new Error("timeout")), WRITE_TIMEOUT_MS);
    });

    const updatedOrder = await Promise.race([updatePromise, writeTimeout]).finally(() => clearTimeout(writeTimer));

    if (!updatedOrder) {
      // Race condition: order status changed between read and write
      return {
        success: false,
        reason: "order_not_cancellable",
        message:
          "Order could not be cancelled. It may have been updated by another process.",
      };
    }

    // Success response
    return {
      success: true,
      data: {
        orderId: updatedOrder._id.toString(),
        status: "Cancelled",
        refundEligible: !!updatedOrder.isPaid,
        cancelledAt: formatDateTime(updatedOrder.cancelledAt),
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
      message: "Something went wrong while cancelling your order.",
    };
  }
}
