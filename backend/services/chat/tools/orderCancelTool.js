/**
 * Order Cancel Tool — Cancels an order if within the cancellation window.
 */

import prisma from "../../../config/prisma.js";

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
            "ID of the order to cancel. If omitted, targets the most recent order.",
        },
      },
      required: [],
    },
  },
};

const NON_CANCELLABLE_STATUSES = ["Out for Delivery", "Delivered", "Cancelled"];
const ALWAYS_ELIGIBLE_STATUSES = ["Placed", "Preparing"];
const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;
const WRITE_TIMEOUT_MS = 5000;

function formatDateTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export async function execute({ orderId, userId }) {
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to cancel an order.",
    };
  }

  try {
    let fetchPromise;

    if (orderId) {
      fetchPromise = prisma.order.findFirst({
        where: { id: orderId, userId },
      });
    } else {
      fetchPromise = prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }

    let fetchTimer;
    const fetchTimeout = new Promise((_, reject) => {
      fetchTimer = setTimeout(() => reject(new Error("timeout")), 3000);
    });

    const order = await Promise.race([fetchPromise, fetchTimeout]).finally(() =>
      clearTimeout(fetchTimer)
    );

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
        message: "You don't have any orders to cancel.",
      };
    }

    if (NON_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
      return {
        success: false,
        reason: "not_cancellable",
        message: `Order cannot be cancelled because it is already '${order.orderStatus}'.`,
      };
    }

    const now = Date.now();
    const createdAt = new Date(order.createdAt).getTime();
    const isWithinWindow = now - createdAt <= CANCELLATION_WINDOW_MS;
    const isAlwaysEligible = ALWAYS_ELIGIBLE_STATUSES.includes(order.orderStatus);

    if (!isWithinWindow && !isAlwaysEligible) {
      return {
        success: false,
        reason: "cancellation_window_expired",
        message:
          "The 5-minute cancellation window for this order has expired. Orders in preparation cannot be cancelled.",
      };
    }

    let writeTimer;
    const writeTimeout = new Promise((_, reject) => {
      writeTimer = setTimeout(() => reject(new Error("timeout")), WRITE_TIMEOUT_MS);
    });

    const updatePromise = prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: "Cancelled",
        cancelledAt: new Date(),
        cancellationReason: "Cancelled by user via chatbot",
      },
    });

    const updatedOrder = await Promise.race([updatePromise, writeTimeout]).finally(() =>
      clearTimeout(writeTimer)
    );

    return {
      success: true,
      data: {
        orderId: updatedOrder.id,
        orderStatus: "Cancelled",
        cancelledAt: formatDateTime(updatedOrder.cancelledAt),
        totalPrice: updatedOrder.totalPrice,
        refundStatus: updatedOrder.refundStatus,
        message: "Your order has been successfully cancelled.",
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
