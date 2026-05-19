/**
 * Unit Tests for Order Status Tool
 *
 * Tests specific examples and edge cases for the orderStatusTool.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.7**
 */

import { jest } from "@jest/globals";

// ─── Mock setup ────────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

// ─── Import modules after mocks ────────────────────────────────────────────────

const Order = (await import("../../models/orderModel.js")).default;
const { execute } = await import(
  "../../services/chat/tools/orderStatusTool.js"
);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("orderStatusTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 1.2, 1.3, 1.4
   */
  test("specific order with all fields populated returns complete response", async () => {
    const mockOrder = {
      _id: "507f1f77bcf86cd799439011",
      orderStatus: "Out for Delivery",
      deliveryStatus: "Out for Delivery",
      estimatedDeliveryAt: new Date("2025-06-15T14:30:00Z"),
      createdAt: new Date("2025-06-15T12:00:00Z"),
      totalPrice: 549.99,
      orderItems: [
        { name: "Butter Chicken", qty: 2 },
        { name: "Garlic Naan", qty: 4 },
        { name: "Mango Lassi", qty: 1 },
      ],
    };

    // Mock for specific orderId query: Order.findOne({ _id, user }).lean()
    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439011",
      userId: "user123",
    });

    expect(result.success).toBe(true);
    expect(result.data.orderId).toBe("507f1f77bcf86cd799439011");
    expect(result.data.orderStatus).toBe("Out for Delivery");
    expect(result.data.deliveryStatus).toBe("Out for Delivery");
    expect(result.data.totalPrice).toBe(549.99);

    // estimatedDeliveryAt should be formatted as a human-readable string
    expect(result.data.estimatedDeliveryAt).not.toBeNull();
    expect(typeof result.data.estimatedDeliveryAt).toBe("string");

    // createdAt should be formatted as a human-readable string
    expect(result.data.createdAt).not.toBeNull();
    expect(typeof result.data.createdAt).toBe("string");

    // orderItems should map name and qty correctly
    expect(result.data.orderItems).toHaveLength(3);
    expect(result.data.orderItems[0]).toEqual({ name: "Butter Chicken", quantity: 2 });
    expect(result.data.orderItems[1]).toEqual({ name: "Garlic Naan", quantity: 4 });
    expect(result.data.orderItems[2]).toEqual({ name: "Mango Lassi", quantity: 1 });

    // Verify the query was called with the correct parameters
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      user: "user123",
    });
  });

  /**
   * Validates: Requirements 1.4
   */
  test("order with null estimatedDeliveryAt still returns successfully", async () => {
    const mockOrder = {
      _id: "507f1f77bcf86cd799439012",
      orderStatus: "Placed",
      deliveryStatus: "None",
      estimatedDeliveryAt: null,
      createdAt: new Date("2025-06-15T12:00:00Z"),
      totalPrice: 299.0,
      orderItems: [{ name: "Paneer Tikka", qty: 1 }],
    };

    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439012",
      userId: "user123",
    });

    expect(result.success).toBe(true);
    expect(result.data.orderId).toBe("507f1f77bcf86cd799439012");
    expect(result.data.estimatedDeliveryAt).toBeNull();
    expect(result.data.orderStatus).toBe("Placed");
    expect(result.data.totalPrice).toBe(299.0);
    expect(result.data.orderItems).toEqual([{ name: "Paneer Tikka", quantity: 1 }]);
  });

  /**
   * Validates: Requirements 1.6
   */
  test("invalid orderId returns not_found", async () => {
    // Order.findOne returns null when order doesn't exist or doesn't belong to user
    const leanMock = jest.fn().mockResolvedValue(null);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439099",
      userId: "user123",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(result.message).toBeDefined();

    // Verify the query included both _id and user
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439099",
      user: "user123",
    });
  });

  /**
   * Validates: Requirements 1.7
   */
  test("user with no orders returns no_orders", async () => {
    // When no orderId is provided and user has no orders, findOne returns null
    const leanMock = jest.fn().mockResolvedValue(null);
    const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
    Order.findOne.mockReturnValue({ sort: sortMock, lean: leanMock });

    const result = await execute({ userId: "user_with_no_orders" });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_orders");
    expect(result.message).toBeDefined();

    // Verify the query was for the user's most recent order
    expect(Order.findOne).toHaveBeenCalledWith({ user: "user_with_no_orders" });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });
});
