/**
 * Order Status Tool — Fetches order status and details for the authenticated user.
 */

import prisma from "../../../config/prisma.js";

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
            "ID of a specific order. If omitted, returns the most recent order.",
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
      message: "Please log in to check your order status.",
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
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }

    let orderStatusTimer;
    const timeoutPromise = new Promise((_, reject) => {
      orderStatusTimer = setTimeout(() => reject(new Error("timeout")), 3000);
    });

    const order = await Promise.race([queryPromise, timeoutPromise]).finally(() =>
      clearTimeout(orderStatusTimer)
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
        message: "You don't have any orders yet.",
      };
    }

    const items = Array.isArray(order.orderItems) ? order.orderItems : [];
    const orderItems = items.map((item) => ({
      name: item.name || "Unknown item",
      qty: item.qty || 1,
      price: item.price || 0,
    }));

    return {
      success: true,
      data: {
        orderId: order.id,
        orderStatus: order.orderStatus,
        totalPrice: order.totalPrice,
        createdAt: formatDateTime(order.createdAt),
        deliveredAt: formatDateTime(order.deliveredAt),
        isDelivered: order.isDelivered,
        isPaid: order.isPaid,
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
