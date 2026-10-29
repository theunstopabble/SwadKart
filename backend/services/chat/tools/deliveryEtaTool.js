/**
 * Delivery ETA Tool — Fetches estimated delivery time and ETA updates for an order.
 */

import prisma from "../../../config/prisma.js";

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
            "ID of the order. If omitted, uses the most recent active order.",
        },
      },
      required: [],
    },
  },
};

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
      message: "Please log in to check delivery ETA.",
    };
  }

  try {
    let queryPromise;

    if (orderId) {
      queryPromise = prisma.order.findFirst({
        where: { id: orderId, userId },
      });
    } else {
      queryPromise = prisma.order.findFirst({
        where: {
          userId,
          orderStatus: { notIn: ["Delivered", "Cancelled"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    let deliveryTimer;
    const timeoutPromise = new Promise((_, reject) => {
      deliveryTimer = setTimeout(() => reject(new Error("timeout")), 3000);
    });

    const order = await Promise.race([queryPromise, timeoutPromise]).finally(() =>
      clearTimeout(deliveryTimer)
    );

    if (!order) {
      return {
        success: false,
        reason: "not_found",
        message: "No active order found. You may not have any orders in progress.",
      };
    }

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

    if (order.orderStatus === "Cancelled") {
      return {
        success: false,
        reason: "order_cancelled",
        message: "This order was cancelled. No delivery ETA is applicable.",
      };
    }

    if (!order.estimatedDeliveryAt) {
      return {
        success: true,
        data: {
          orderId: order.id,
          orderStatus: order.orderStatus,
          estimatedDeliveryAt: null,
          message: "ETA is being calculated. Please check back shortly.",
        },
      };
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        orderStatus: order.orderStatus,
        estimatedDeliveryAt: formatDateTime(order.estimatedDeliveryAt),
        message: `Estimated delivery by ${formatDateTime(order.estimatedDeliveryAt)}.`,
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
