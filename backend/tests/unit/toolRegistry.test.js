/**
 * Unit tests for toolRegistry.js
 *
 * Validates that buildToolRegistry and getToolExecutor work correctly
 * for authenticated and unauthenticated users.
 */

import { jest } from "@jest/globals";

// Mock the orderPlacementTool to avoid mongoose dependency
jest.unstable_mockModule("../../services/chat/orderPlacementTool.js", () => ({
  toolSchema: {
    type: "function",
    function: {
      name: "place_order",
      description: "Add an in-stock SwadKart product to the authenticated user's cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          quantity: { type: "integer", description: "Quantity", minimum: 1, maximum: 10 },
        },
        required: ["productId", "quantity"],
      },
    },
  },
  executeOrderPlacement: jest.fn().mockResolvedValue({ success: true }),
  Cart: { findOneAndUpdate: jest.fn() },
}));

const { buildToolRegistry, getToolExecutor } = await import(
  "../../services/chat/tools/toolRegistry.js"
);

describe("toolRegistry", () => {
  describe("buildToolRegistry", () => {
    it("should always include faq_support regardless of auth", () => {
      const tools = buildToolRegistry({ userId: null });
      const names = tools.map((t) => t.function.name);
      expect(names).toContain("faq_support");
    });

    it("should only include faq_support when userId is null", () => {
      const tools = buildToolRegistry({ userId: null });
      const names = tools.map((t) => t.function.name);
      expect(names).toEqual(["faq_support"]);
    });

    it("should only include faq_support when userId is undefined", () => {
      const tools = buildToolRegistry({ userId: undefined });
      const names = tools.map((t) => t.function.name);
      expect(names).toEqual(["faq_support"]);
    });

    it("should only include faq_support when userId is empty string", () => {
      const tools = buildToolRegistry({ userId: "" });
      const names = tools.map((t) => t.function.name);
      expect(names).toEqual(["faq_support"]);
    });

    it("should include all tools when userId is truthy", () => {
      const tools = buildToolRegistry({ userId: "user123" });
      const names = tools.map((t) => t.function.name);

      expect(names).toContain("faq_support");
      expect(names).toContain("place_order");
      expect(names).toContain("get_order_status");
      expect(names).toContain("cancel_order");
      expect(names).toContain("coupon_offers");
      expect(names).toContain("get_delivery_eta");
      expect(names).toContain("reorder_last");
    });

    it("should return 7 tools for authenticated users", () => {
      const tools = buildToolRegistry({ userId: "user123" });
      expect(tools).toHaveLength(7);
    });

    it("should return 1 tool for unauthenticated users", () => {
      const tools = buildToolRegistry({ userId: null });
      expect(tools).toHaveLength(1);
    });

    it("should return valid Groq-compatible schemas", () => {
      const tools = buildToolRegistry({ userId: "user123" });
      for (const tool of tools) {
        expect(tool.type).toBe("function");
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        expect(tool.function.parameters).toBeDefined();
        expect(tool.function.parameters.type).toBe("object");
      }
    });
  });

  describe("getToolExecutor", () => {
    it("should return a function for faq_support", () => {
      const executor = getToolExecutor("faq_support");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for place_order", () => {
      const executor = getToolExecutor("place_order");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for get_order_status", () => {
      const executor = getToolExecutor("get_order_status");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for cancel_order", () => {
      const executor = getToolExecutor("cancel_order");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for coupon_offers", () => {
      const executor = getToolExecutor("coupon_offers");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for get_delivery_eta", () => {
      const executor = getToolExecutor("get_delivery_eta");
      expect(typeof executor).toBe("function");
    });

    it("should return a function for reorder_last", () => {
      const executor = getToolExecutor("reorder_last");
      expect(typeof executor).toBe("function");
    });

    it("should return null for unknown function names", () => {
      const executor = getToolExecutor("nonexistent_tool");
      expect(executor).toBeNull();
    });

    it("should return null for empty string", () => {
      const executor = getToolExecutor("");
      expect(executor).toBeNull();
    });

    it("should return null for undefined", () => {
      const executor = getToolExecutor(undefined);
      expect(executor).toBeNull();
    });
  });
});
