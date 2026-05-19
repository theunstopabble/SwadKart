/**
 * Unit Tests for Reorder Tool
 *
 * Tests specific examples and edge cases for the reorderTool.
 *
 * **Validates: Requirements 6.4, 6.5, 6.6, 6.7, 6.9**
 */

import { jest } from "@jest/globals";

// ─── Mock setup ────────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  abortTransaction: jest.fn().mockResolvedValue(undefined),
  endSession: jest.fn(),
};

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn().mockResolvedValue(mockSession),
  },
}));

jest.unstable_mockModule("../../services/chat/orderPlacementTool.js", () => ({
  toolSchema: { type: "function", function: { name: "place_order" } },
  executeOrderPlacement: jest.fn(),
  Cart: {
    findOneAndUpdate: jest.fn().mockResolvedValue({ user: "user123", items: [] }),
  },
}));

// ─── Import modules after mocks ────────────────────────────────────────────────

const Order = (await import("../../models/orderModel.js")).default;
const Product = (await import("../../models/productModel.js")).default;
const mongoose = (await import("mongoose")).default;
const { Cart } = await import("../../services/chat/orderPlacementTool.js");
const { execute } = await import(
  "../../services/chat/tools/reorderTool.js"
);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("reorderTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.startSession.mockResolvedValue(mockSession);
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
    Cart.findOneAndUpdate.mockResolvedValue({ user: "user123", items: [] });
  });

  /**
   * Validates: Requirements 6.4, 6.5
   */
  test("all items available — full success with correct cart total", async () => {
    const mockOrder = {
      _id: "order001",
      user: "user123",
      orderStatus: "Delivered",
      orderItems: [
        { name: "Butter Chicken", qty: 2, price: 350, product: "prod001", image: "img1.jpg", restaurant: "rest001" },
        { name: "Garlic Naan", qty: 4, price: 60, product: "prod002", image: "img2.jpg", restaurant: "rest001" },
        { name: "Mango Lassi", qty: 1, price: 120, product: "prod003", image: "img3.jpg", restaurant: "rest001" },
      ],
    };

    const orderLeanMock = jest.fn().mockResolvedValue(mockOrder);
    const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
    Order.findOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

    // All products exist, are available, and in stock
    Product.findById.mockImplementation((id) => {
      const products = {
        prod001: { _id: "prod001", name: "Butter Chicken", isAvailable: true, countInStock: 50, price: 350 },
        prod002: { _id: "prod002", name: "Garlic Naan", isAvailable: true, countInStock: 100, price: 60 },
        prod003: { _id: "prod003", name: "Mango Lassi", isAvailable: true, countInStock: 30, price: 120 },
      };
      return { lean: jest.fn().mockResolvedValue(products[id] || null) };
    });

    const result = await execute({ userId: "user123" });

    expect(result.success).toBe(true);
    expect(result.data.addedItems).toHaveLength(3);
    expect(result.data.skippedItems).toHaveLength(0);

    // Verify items
    expect(result.data.addedItems[0]).toEqual({ name: "Butter Chicken", quantity: 2, price: 350 });
    expect(result.data.addedItems[1]).toEqual({ name: "Garlic Naan", quantity: 4, price: 60 });
    expect(result.data.addedItems[2]).toEqual({ name: "Mango Lassi", quantity: 1, price: 120 });

    // Verify total: (350*2) + (60*4) + (120*1) = 700 + 240 + 120 = 1060
    expect(result.data.totalCartValue).toBe(1060);

    // Verify transaction was used
    expect(mongoose.startSession).toHaveBeenCalled();
    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  /**
   * Validates: Requirements 6.7
   */
  test("all items unavailable — returns no_items_available", async () => {
    const mockOrder = {
      _id: "order002",
      user: "user123",
      orderStatus: "Delivered",
      orderItems: [
        { name: "Discontinued Curry", qty: 1, price: 400, product: "prod010", image: "img.jpg", restaurant: "rest001" },
        { name: "Old Biryani", qty: 2, price: 300, product: "prod011", image: "img.jpg", restaurant: "rest001" },
        { name: "Removed Dessert", qty: 1, price: 150, product: "prod012", image: "img.jpg", restaurant: "rest001" },
      ],
    };

    const orderLeanMock = jest.fn().mockResolvedValue(mockOrder);
    const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
    Order.findOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

    // prod010: not found, prod011: unavailable, prod012: out of stock
    Product.findById.mockImplementation((id) => {
      if (id === "prod010") return { lean: jest.fn().mockResolvedValue(null) };
      if (id === "prod011") return { lean: jest.fn().mockResolvedValue({ _id: "prod011", isAvailable: false, countInStock: 10 }) };
      if (id === "prod012") return { lean: jest.fn().mockResolvedValue({ _id: "prod012", isAvailable: true, countInStock: 0 }) };
      return { lean: jest.fn().mockResolvedValue(null) };
    });

    const result = await execute({ userId: "user123" });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_items_available");
    expect(result.message).toBeDefined();

    // No cart write should occur
    expect(mongoose.startSession).not.toHaveBeenCalled();
  });

  /**
   * Validates: Requirements 6.6
   */
  test("mixed availability — partial success listing added and skipped items", async () => {
    const mockOrder = {
      _id: "order003",
      user: "user123",
      orderStatus: "Delivered",
      orderItems: [
        { name: "Available Pizza", qty: 2, price: 250, product: "prod020", image: "img.jpg", restaurant: "rest001" },
        { name: "Available Pasta", qty: 1, price: 180, product: "prod021", image: "img.jpg", restaurant: "rest001" },
        { name: "Out of Stock Salad", qty: 1, price: 100, product: "prod022", image: "img.jpg", restaurant: "rest001" },
      ],
    };

    const orderLeanMock = jest.fn().mockResolvedValue(mockOrder);
    const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
    Order.findOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

    Product.findById.mockImplementation((id) => {
      if (id === "prod020") return { lean: jest.fn().mockResolvedValue({ _id: "prod020", name: "Available Pizza", isAvailable: true, countInStock: 20, price: 250 }) };
      if (id === "prod021") return { lean: jest.fn().mockResolvedValue({ _id: "prod021", name: "Available Pasta", isAvailable: true, countInStock: 15, price: 180 }) };
      if (id === "prod022") return { lean: jest.fn().mockResolvedValue({ _id: "prod022", name: "Out of Stock Salad", isAvailable: true, countInStock: 0, price: 100 }) };
      return { lean: jest.fn().mockResolvedValue(null) };
    });

    const result = await execute({ userId: "user123" });

    expect(result.success).toBe(true);
    expect(result.data.addedItems).toHaveLength(2);
    expect(result.data.skippedItems).toHaveLength(1);

    // Verify added items
    expect(result.data.addedItems[0]).toEqual({ name: "Available Pizza", quantity: 2, price: 250 });
    expect(result.data.addedItems[1]).toEqual({ name: "Available Pasta", quantity: 1, price: 180 });

    // Verify skipped item
    expect(result.data.skippedItems[0]).toEqual({ name: "Out of Stock Salad", reason: "out_of_stock" });

    // Verify total: (250*2) + (180*1) = 500 + 180 = 680
    expect(result.data.totalCartValue).toBe(680);

    // Transaction should still be used for the available items
    expect(mongoose.startSession).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });

  /**
   * Validates: Requirements 6.9
   */
  test("user with no completed orders returns no_orders", async () => {
    // No Delivered orders found
    const orderLeanMock = jest.fn().mockResolvedValue(null);
    const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
    Order.findOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

    const result = await execute({ userId: "user_no_orders" });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_orders");
    expect(result.message).toBeDefined();

    // No product lookups or cart writes should occur
    expect(Product.findById).not.toHaveBeenCalled();
    expect(mongoose.startSession).not.toHaveBeenCalled();
  });
});
