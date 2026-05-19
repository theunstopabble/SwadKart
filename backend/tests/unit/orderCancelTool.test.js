/**
 * Unit Tests for Order Cancel Tool
 *
 * Tests specific examples and edge cases for the orderCancelTool.
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.7**
 */

import { jest } from "@jest/globals";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const mockOrderFindOne = jest.fn();
const mockOrderFindOneAndUpdate = jest.fn();

jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: {
    findOne: mockOrderFindOne,
    findOneAndUpdate: mockOrderFindOneAndUpdate,
  },
}));

// ─── Import after mocks ────────────────────────────────────────────────────────

const { execute } = await import(
  "../../services/chat/tools/orderCancelTool.js"
);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("orderCancelTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("5-minute boundary edge case", () => {
    /**
     * Validates: Requirement 2.2
     * Order at the 5-minute boundary should be eligible because the rule is:
     * currentTime − createdAt ≤ 5 minutes (inclusive).
     * We use 4 minutes 59 seconds to account for test execution time while
     * still testing the boundary behavior.
     */
    test("order at 5-minute boundary with status Ready is eligible", async () => {
      // Use 4min 59sec to ensure we're within the window even with execution time
      const now = new Date();
      const justWithinWindow = new Date(now.getTime() - (5 * 60 * 1000 - 1000));

      const mockOrder = {
        _id: "order_boundary",
        user: "user123",
        orderStatus: "Ready",
        createdAt: justWithinWindow,
        isPaid: true,
        totalPrice: 450,
        orderItems: [{ name: "Dosa", qty: 2 }],
      };

      const leanMock = jest.fn().mockResolvedValue(mockOrder);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

      const updatedOrder = {
        ...mockOrder,
        orderStatus: "Cancelled",
        cancelledAt: now,
        cancellationReason: "Cancelled via chatbot",
      };
      const updateLeanMock = jest.fn().mockResolvedValue(updatedOrder);
      mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });

      const result = await execute({ userId: "user123" });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("Cancelled");
      expect(result.data.refundEligible).toBe(true);
    });
  });

  describe("terminal states return order_not_cancellable", () => {
    /**
     * Validates: Requirement 2.6
     * Orders with status "Out for Delivery", "Delivered", or "Cancelled"
     * should always return order_not_cancellable.
     */
    const terminalStatuses = ["Out for Delivery", "Delivered", "Cancelled"];

    test.each(terminalStatuses)(
      'order with status "%s" returns order_not_cancellable',
      async (status) => {
        const mockOrder = {
          _id: "order_terminal",
          user: "user123",
          orderStatus: status,
          createdAt: new Date(), // Even if just placed
          isPaid: true,
          totalPrice: 300,
          orderItems: [{ name: "Naan", qty: 3 }],
        };

        const leanMock = jest.fn().mockResolvedValue(mockOrder);
        const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
        mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

        const result = await execute({ userId: "user123" });

        expect(result.success).toBe(false);
        expect(result.reason).toBe("order_not_cancellable");
        expect(result.message).toContain(status);
        // findOneAndUpdate should NOT be called for terminal statuses
        expect(mockOrderFindOneAndUpdate).not.toHaveBeenCalled();
      }
    );
  });

  describe("successful cancellation returns correct refundEligible", () => {
    /**
     * Validates: Requirements 2.3, 2.4
     * refundEligible should be true when isPaid is true, false otherwise.
     */
    test("isPaid=true → refundEligible=true", async () => {
      const now = new Date();
      const mockOrder = {
        _id: "order_paid",
        user: "user123",
        orderStatus: "Placed",
        createdAt: new Date(now.getTime() - 60000), // 1 minute ago
        isPaid: true,
        totalPrice: 600,
        orderItems: [{ name: "Paneer Tikka", qty: 1 }],
      };

      const leanMock = jest.fn().mockResolvedValue(mockOrder);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

      const updatedOrder = {
        ...mockOrder,
        orderStatus: "Cancelled",
        cancelledAt: now,
        cancellationReason: "Cancelled via chatbot",
      };
      const updateLeanMock = jest.fn().mockResolvedValue(updatedOrder);
      mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });

      const result = await execute({ userId: "user123" });

      expect(result.success).toBe(true);
      expect(result.data.refundEligible).toBe(true);
      expect(result.data.status).toBe("Cancelled");
      expect(result.data.orderId).toBe("order_paid");
    });

    test("isPaid=false → refundEligible=false", async () => {
      const now = new Date();
      const mockOrder = {
        _id: "order_unpaid",
        user: "user123",
        orderStatus: "Preparing",
        createdAt: new Date(now.getTime() - 120000), // 2 minutes ago
        isPaid: false,
        totalPrice: 250,
        orderItems: [{ name: "Chai", qty: 2 }],
      };

      const leanMock = jest.fn().mockResolvedValue(mockOrder);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

      const updatedOrder = {
        ...mockOrder,
        orderStatus: "Cancelled",
        cancelledAt: now,
        cancellationReason: "Cancelled via chatbot",
      };
      const updateLeanMock = jest.fn().mockResolvedValue(updatedOrder);
      mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });

      const result = await execute({ userId: "user123" });

      expect(result.success).toBe(true);
      expect(result.data.refundEligible).toBe(false);
      expect(result.data.status).toBe("Cancelled");
      expect(result.data.orderId).toBe("order_unpaid");
    });
  });

  describe("Ready status past 5 minutes returns cancellation_window_expired", () => {
    /**
     * Validates: Requirement 2.7
     * Order in "Ready" status placed more than 5 minutes ago should return
     * cancellation_window_expired.
     */
    test('order in "Ready" status at 6 minutes ago returns cancellation_window_expired', async () => {
      const now = new Date();
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);

      const mockOrder = {
        _id: "order_ready_expired",
        user: "user123",
        orderStatus: "Ready",
        createdAt: sixMinutesAgo,
        isPaid: true,
        totalPrice: 800,
        orderItems: [{ name: "Thali", qty: 1 }],
      };

      const leanMock = jest.fn().mockResolvedValue(mockOrder);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

      const result = await execute({ userId: "user123" });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("cancellation_window_expired");
      expect(result.message).toContain("cancellation window has expired");
      // findOneAndUpdate should NOT be called when window expired
      expect(mockOrderFindOneAndUpdate).not.toHaveBeenCalled();
    });
  });
});
