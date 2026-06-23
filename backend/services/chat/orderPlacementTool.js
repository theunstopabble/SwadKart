/**
 * Order Placement Tool — Groq Function-Calling Tool for Cart Operations
 *
 * Exposes a tool schema for Groq tool_use and an execution function that
 * validates inputs through a series of gates before writing to the cart.
 *
 * Gates:
 *   1. Auth required (userId must be truthy)
 *   2. Product existence (Product.findById)
 *   3. Quantity range (integer 1–10)
 *   4. Stock availability (product.stock >= quantity AND product.isAvailable)
 *   5. Cart write on User model (shared with frontend)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import Product from "../../models/productModel.js";
import User from "../../models/userModel.js";

/**
 * Groq-compatible tool schema for the place_order function.
 */
export const toolSchema = {
  type: "function",
  function: {
    name: "place_order",
    description:
      "Add an in-stock SwadKart product to the authenticated user's cart.",
    parameters: {
      type: "object",
      properties: {
        productId: {
          type: "string",
          description: "The MongoDB ObjectId of the product to add to cart.",
        },
        quantity: {
          type: "integer",
          description: "Number of units to add (1–10).",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["productId", "quantity"],
    },
  },
};

/**
 * Execute the order placement tool.
 *
 * Validates inputs through sequential gates and writes to the User model's
 * cartItems array (shared with the frontend).
 *
 * @param {object} params
 * @param {string} params.productId - Product ID to add
 * @param {number} params.quantity - Quantity to add (1–10)
 * @param {string|null} params.userId - Authenticated user ID (null = anonymous)
 * @returns {Promise<object>} Result object with success/failure info
 */
export async function executeOrderPlacement({
  productId,
  quantity,
  userId,
}) {
  try {
    // Gate 1: Authentication required
    if (!userId) {
      return { success: false, reason: "auth_required" };
    }

    // Gate 2: Product must exist
    let product;
    try {
      product = await Product.findById(productId);
    } catch {
      return { success: false, reason: "product_not_found" };
    }

    if (!product) {
      return { success: false, reason: "product_not_found" };
    }

    // Gate 3: Quantity must be an integer between 1 and 10
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return { success: false, reason: "invalid_quantity" };
    }

    // Gate 4: Stock check — product must be available and have sufficient stock
    if (!product.isAvailable || product.countInStock < quantity) {
      return { success: false, reason: "out_of_stock" };
    }

    // Gate 5: Write to shared User.cartItems (visible to frontend profile)
    // Merge: remove existing entry for same product, then add updated entry
    await User.findByIdAndUpdate(userId, {
      $pull: { cartItems: { product: productId } },
    });
    await User.findByIdAndUpdate(userId, {
      $push: { cartItems: { product: productId, quantity } },
    });

    // Success
    return {
      success: true,
      product: {
        name: product.name,
        price: product.price,
        quantity,
      },
    };
  } catch (err) {
    if (err.message === "timeout") {
      return { success: false, reason: "timeout" };
    }
    return { success: false, reason: "internal_error" };
  }
}
