/**
 * Reorder Tool — Repeats the user's last completed order by adding items to cart.
 */

import prisma from "../../../config/prisma.js";

export const toolSchema = {
  type: "function",
  function: {
    name: "reorder_last",
    description:
      "Repeat the user's last completed order by adding all items to the cart.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export async function execute({ userId }, { orderQueryTimeoutMs = 3000 } = {}) {
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to reorder.",
    };
  }

  try {
    const orderQueryPromise = prisma.order.findFirst({
      where: {
        userId,
        orderStatus: "Delivered",
      },
      orderBy: { createdAt: "desc" },
    });

    const orderTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), orderQueryTimeoutMs)
    );

    const order = await Promise.race([orderQueryPromise, orderTimeoutPromise]);

    if (!order) {
      return {
        success: false,
        reason: "no_orders",
        message: "You don't have any completed orders to reorder.",
      };
    }

    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    const addedItems = [];
    const skippedItems = [];

    for (const item of orderItems) {
      const prodId = (item.product || item._id || item.id)?.toString();
      let product = null;
      if (prodId) {
        try {
          product = await prisma.product.findUnique({ where: { id: prodId } });
        } catch {
          product = null;
        }
      }

      if (!product || !product.isAvailable) {
        skippedItems.push({ name: item.name || "Item", reason: "unavailable" });
        continue;
      }

      if (product.countInStock <= 0) {
        skippedItems.push({ name: item.name || "Item", reason: "out_of_stock" });
        continue;
      }

      addedItems.push({
        product: product.id,
        name: product.name,
        quantity: item.qty || 1,
        price: product.price,
      });
    }

    if (addedItems.length === 0) {
      return {
        success: false,
        reason: "no_items_available",
        message:
          "None of the items from your last order are currently available.",
      };
    }

    // Write to shared User.cartItems
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cartItems: true },
    });

    const productIds = new Set(addedItems.map((item) => item.product));
    let cart = Array.isArray(user?.cartItems) ? [...user.cartItems] : [];
    cart = cart.filter((item) => !productIds.has(item.product) && !productIds.has(item.id));

    for (const item of addedItems) {
      cart.push({ product: item.product, quantity: item.quantity });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { cartItems: cart },
    });

    const totalCartValue = addedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const responseAddedItems = addedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      success: true,
      data: {
        addedItems: responseAddedItems,
        skippedItems,
        totalCartValue,
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
      message: "Something went wrong while processing your reorder.",
    };
  }
}
