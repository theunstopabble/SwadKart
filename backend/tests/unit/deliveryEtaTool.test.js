/**
 * Unit Tests for Delivery ETA Tool
 *
 * Tests specific examples and edge cases for the deliveryEtaTool.
 *
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
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
  "../../services/chat/tools/deliveryEtaTool.js"
);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("deliveryEtaTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirement 4.4
   * Delivered order returns `order_delivered` with `deliveredAt` timestamp
   */
  test("delivered order returns order_delivered with deliveredAt timestamp", async () => {
    const deliveredDate = new Date("2025-06-14T18:45:00Z");
    const mockOrder = {
      _id: "507f1f77bcf86cd799439011",
      orderStatus: "Delivered",
      deliveryStatus: "Delivered",
      estimatedDeliveryAt: new Date("2025-06-14T18:30:00Z"),
      deliveredAt: deliveredDate,
      etaUpdates: [],
    };

    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439011",
      userId: "user123",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("order_delivered");
    expect(result.message).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.deliveredAt).not.toBeNull();
    expect(typeof result.data.deliveredAt).toBe("string");

    // Verify the query was called with orderId and user
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      user: "user123",
    });
  });

  /**
   * Validates: Requirement 4.5
   * Cancelled order returns `order_cancelled`
   */
  test("cancelled order returns order_cancelled", async () => {
    const mockOrder = {
      _id: "507f1f77bcf86cd799439012",
      orderStatus: "Cancelled",
      deliveryStatus: "None",
      estimatedDeliveryAt: null,
      cancelledAt: new Date("2025-06-14T12:05:00Z"),
      etaUpdates: [],
    };

    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439012",
      userId: "user123",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("order_cancelled");
    expect(result.message).toBeDefined();

    // Verify the query was called with orderId and user
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439012",
      user: "user123",
    });
  });

  /**
   * Validates: Requirement 4.3
   * Order with no `estimatedDeliveryAt` returns `eta_not_available`
   */
  test("order with no estimatedDeliveryAt returns eta_not_available", async () => {
    const mockOrder = {
      _id: "507f1f77bcf86cd799439013",
      orderStatus: "Placed",
      deliveryStatus: "None",
      estimatedDeliveryAt: null,
      etaUpdates: [],
    };

    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439013",
      userId: "user123",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("eta_not_available");
    expect(result.message).toBeDefined();

    // Verify the query was called with orderId and user
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439013",
      user: "user123",
    });
  });

  /**
   * Validates: Requirement 4.2
   * Order with multiple `etaUpdates` returns the most recent entry (last element)
   */
  test("order with multiple etaUpdates returns the most recent entry", async () => {
    const mockOrder = {
      _id: "507f1f77bcf86cd799439014",
      orderStatus: "Out for Delivery",
      deliveryStatus: "Out for Delivery",
      estimatedDeliveryAt: new Date("2025-06-15T14:30:00Z"),
      etaUpdates: [
        {
          timestamp: new Date("2025-06-15T13:00:00Z"),
          estimatedMinutes: 45,
          reason: "traffic",
        },
        {
          timestamp: new Date("2025-06-15T13:30:00Z"),
          estimatedMinutes: 30,
          reason: "on track",
        },
      ],
    };

    const leanMock = jest.fn().mockResolvedValue(mockOrder);
    Order.findOne.mockReturnValue({ lean: leanMock });

    const result = await execute({
      orderId: "507f1f77bcf86cd799439014",
      userId: "user123",
    });

    expect(result.success).toBe(true);
    expect(result.data.orderId).toBe("507f1f77bcf86cd799439014");
    expect(result.data.deliveryStatus).toBe("Out for Delivery");
    expect(result.data.estimatedDeliveryAt).not.toBeNull();
    expect(typeof result.data.estimatedDeliveryAt).toBe("string");

    // latestEtaUpdate should be the LAST element of etaUpdates array
    expect(result.data.latestEtaUpdate).toEqual({
      estimatedMinutes: 30,
      reason: "on track",
    });

    // Verify the query was called with orderId and user
    expect(Order.findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439014",
      user: "user123",
    });
  });
});
