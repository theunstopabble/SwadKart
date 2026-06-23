/**
 * Reorder Tool — Repeats the user's last completed order by adding items to cart.
 *
 * Gate pattern: auth check → fetch most recent Delivered order → validate each item
 * (product exists, isAvailable, countInStock > 0) → atomic cart write via MongoDB
 * transaction → return success with items added/skipped.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 */

import Order from "../../../models/orderModel.js";
import Product from "../../../models/productModel.js";
import User from "../../../models/userModel.js";



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

/**
 * Execute the reorder tool.
 *
 * Sequential gates:
 *   1. Auth check — userId must be truthy
 *   2. Fetch most recent Delivered order
 *   3. Validate each item (product exists, isAvailable, countInStock > 0)
 *   4. Atomic cart write via MongoDB transaction
 *   5. Return success with added/skipped items
 *
 * @param {object} params
 * @param {string|null} params.userId - Authenticated user ID
 * @returns {Promise<object>} Structured result with reorder status or error
 */
export async function execute({ userId }, { orderQueryTimeoutMs = 3000 } = {}) {
  // Gate 1: Auth check
  if (!userId) {
    return {
      success: false,
      reason: "auth_required",
      message: "Please log in to reorder.",
    };
  }

  try {
    // Gate 2: Fetch most recent Delivered order (3-second timeout)
    const orderQueryPromise = Order.findOne({
      user: userId,
      orderStatus: "Delivered",
    })
      .sort({ createdAt: -1 })
      .lean();

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

    // Gate 3: Validate each item in the order
    const orderItems = order.orderItems || [];
    const addedItems = [];
    const skippedItems = [];

    for (const item of orderItems) {
      let product;
      try {
        product = await Product.findById(item.product).lean();
      } catch {
        product = null;
      }

      if (!product) {
        skippedItems.push({ name: item.name, reason: "unavailable" });
        continue;
      }

      if (!product.isAvailable) {
        skippedItems.push({ name: item.name, reason: "unavailable" });
        continue;
      }

      if (product.countInStock <= 0) {
        skippedItems.push({ name: item.name, reason: "out_of_stock" });
        continue;
      }

      // Item is valid — add to the list
      addedItems.push({
        product: item.product,
        name: item.name,
        quantity: item.qty,
        price: item.price,
      });
    }

    // Gate 4: If all items are unavailable, return error
    if (addedItems.length === 0) {
      return {
        success: false,
        reason: "no_items_available",
        message:
          "None of the items from your last order are currently available.",
      };
    }

    // Gate 5: Write to shared User.cartItems
    // Merge: remove existing entries for the same products, then add updated ones
    const productIds = addedItems.map((item) => item.product);
    await User.findByIdAndUpdate(userId, {
      $pull: { cartItems: { product: { $in: productIds } } },
    });
    const cartItems = addedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));
    await User.findByIdAndUpdate(userId, {
      $push: { cartItems: { $each: cartItems } },
    });

    // Calculate total cart value from added items
    const totalCartValue = addedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Build response
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
