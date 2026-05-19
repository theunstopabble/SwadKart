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
 *   5. Cart write with 5s timeout
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import Product from "../../models/productModel.js";
import mongoose from "mongoose";

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
 * Cart schema for persisting user cart items in MongoDB.
 * Uses a simple find-or-create pattern per userId.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

// Avoid model recompilation in hot-reload scenarios
const Cart =
  mongoose.models.Cart || mongoose.model("Cart", cartSchema);

/**
 * Execute the order placement tool.
 *
 * Validates inputs through sequential gates and writes to the cart
 * only when all gates pass. Uses a 5-second timeout on the cart write.
 *
 * @param {object} params
 * @param {string} params.productId - Product ID to add
 * @param {number} params.quantity - Quantity to add (1–10)
 * @param {string|null} params.userId - Authenticated user ID (null = anonymous)
 * @param {object} [params.cartModel] - Optional Cart model override (for testing)
 * @returns {Promise<object>} Result object with success/failure info
 */
export async function executeOrderPlacement({
  productId,
  quantity,
  userId,
  cartModel,
}) {
  const CartModel = cartModel || Cart;

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

    // Gate 5: Cart write with 5s timeout
    const cartWritePromise = (async () => {
      let cart = await CartModel.findOne({ user: userId });

      if (!cart) {
        cart = new CartModel({ user: userId, items: [] });
      }

      // Push the new item to the cart
      cart.items.push({ product: productId, quantity });
      await cart.save();

      return cart;
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Cart write timeout")), 5000)
    );

    try {
      await Promise.race([cartWritePromise, timeoutPromise]);
    } catch (err) {
      if (err.message === "Cart write timeout") {
        return { success: false, reason: "timeout" };
      }
      return { success: false, reason: "internal_error" };
    }

    // Success
    return {
      success: true,
      product: {
        name: product.name,
        price: product.price,
        quantity,
      },
    };
  } catch {
    // Catch-all for unexpected errors
    return { success: false, reason: "internal_error" };
  }
}

export { Cart };
