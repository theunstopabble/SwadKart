/**
 * Unit tests for orderPlacementTool.js
 *
 * Tests the validation gates and cart write logic using mocked
 * Product model and Cart model dependencies.
 */

import { jest } from "@jest/globals";

// Mock Product model before importing the module
const mockFindById = jest.fn();
jest.unstable_mockModule("../models/productModel.js", () => ({
  default: { findById: mockFindById },
}));

const { toolSchema, executeOrderPlacement } = await import(
  "../services/chat/orderPlacementTool.js"
);

describe("orderPlacementTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("toolSchema", () => {
    it("should have the correct structure for Groq tool_use", () => {
      expect(toolSchema.type).toBe("function");
      expect(toolSchema.function.name).toBe("place_order");
      expect(toolSchema.function.parameters.required).toEqual([
        "productId",
        "quantity",
      ]);
      expect(
        toolSchema.function.parameters.properties.productId.type
      ).toBe("string");
      expect(
        toolSchema.function.parameters.properties.quantity.type
      ).toBe("integer");
      expect(
        toolSchema.function.parameters.properties.quantity.minimum
      ).toBe(1);
      expect(
        toolSchema.function.parameters.properties.quantity.maximum
      ).toBe(10);
    });
  });

  describe("executeOrderPlacement", () => {
    const mockCartModel = {
      findOne: jest.fn(),
    };

    const validProduct = {
      _id: "product123",
      name: "Butter Chicken",
      price: 350,
      countInStock: 20,
      isAvailable: true,
    };

    // Gate 1: Auth required
    describe("Gate 1 - Authentication", () => {
      it("should return auth_required when userId is null", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: null,
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "auth_required" });
      });

      it("should return auth_required when userId is undefined", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: undefined,
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "auth_required" });
      });

      it("should return auth_required when userId is empty string", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: "",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "auth_required" });
      });
    });

    // Gate 2: Product existence
    describe("Gate 2 - Product existence", () => {
      it("should return product_not_found when product does not exist", async () => {
        mockFindById.mockResolvedValue(null);

        const result = await executeOrderPlacement({
          productId: "nonexistent",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "product_not_found" });
      });

      it("should return product_not_found when findById throws", async () => {
        mockFindById.mockRejectedValue(new Error("DB error"));

        const result = await executeOrderPlacement({
          productId: "bad-id",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "product_not_found" });
      });
    });

    // Gate 3: Quantity range
    describe("Gate 3 - Quantity validation", () => {
      beforeEach(() => {
        mockFindById.mockResolvedValue(validProduct);
      });

      it("should return invalid_quantity when quantity is 0", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 0,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "invalid_quantity" });
      });

      it("should return invalid_quantity when quantity is negative", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: -1,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "invalid_quantity" });
      });

      it("should return invalid_quantity when quantity exceeds 10", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 11,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "invalid_quantity" });
      });

      it("should return invalid_quantity when quantity is not an integer", async () => {
        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2.5,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "invalid_quantity" });
      });
    });

    // Gate 4: Stock check
    describe("Gate 4 - Stock availability", () => {
      it("should return out_of_stock when product is not available", async () => {
        mockFindById.mockResolvedValue({
          ...validProduct,
          isAvailable: false,
        });

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "out_of_stock" });
      });

      it("should return out_of_stock when stock is insufficient", async () => {
        mockFindById.mockResolvedValue({
          ...validProduct,
          countInStock: 1,
        });

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 5,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "out_of_stock" });
      });

      it("should return out_of_stock when stock is zero", async () => {
        mockFindById.mockResolvedValue({
          ...validProduct,
          countInStock: 0,
        });

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 1,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "out_of_stock" });
      });
    });

    // Gate 5: Cart write with timeout
    describe("Gate 5 - Cart write", () => {
      beforeEach(() => {
        mockFindById.mockResolvedValue(validProduct);
      });

      it("should successfully add item to existing cart", async () => {
        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockResolvedValue(true),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({
          success: true,
          product: { name: "Butter Chicken", price: 350, quantity: 2 },
        });
        expect(mockCart.items.push).toHaveBeenCalledWith({
          product: "product123",
          quantity: 2,
        });
        expect(mockCart.save).toHaveBeenCalled();
      });

      it("should create a new cart when none exists", async () => {
        const mockSave = jest.fn().mockResolvedValue(true);
        const mockItems = [];
        mockCartModel.findOne.mockResolvedValue(null);

        // Mock the constructor behavior
        const originalCartModel = {
          findOne: mockCartModel.findOne,
        };

        // Create a mock that simulates new CartModel()
        const mockCartModelWithConstructor = function (data) {
          return { ...data, items: mockItems, save: mockSave };
        };
        mockCartModelWithConstructor.findOne = mockCartModel.findOne;

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 1,
          userId: "user123",
          cartModel: mockCartModelWithConstructor,
        });

        expect(result).toEqual({
          success: true,
          product: { name: "Butter Chicken", price: 350, quantity: 1 },
        });
        expect(mockSave).toHaveBeenCalled();
      });

      it("should return timeout when cart write exceeds 5s", async () => {
        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 6000))
          ),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "timeout" });
      }, 10000);

      it("should return internal_error when cart save throws", async () => {
        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockRejectedValue(new Error("DB write error")),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 2,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result).toEqual({ success: false, reason: "internal_error" });
      });
    });

    // Boundary tests
    describe("Boundary values", () => {
      beforeEach(() => {
        mockFindById.mockResolvedValue(validProduct);
      });

      it("should accept quantity of exactly 1", async () => {
        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockResolvedValue(true),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 1,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result.success).toBe(true);
      });

      it("should accept quantity of exactly 10", async () => {
        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockResolvedValue(true),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 10,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result.success).toBe(true);
      });

      it("should pass when stock exactly equals quantity", async () => {
        mockFindById.mockResolvedValue({
          ...validProduct,
          countInStock: 5,
        });

        const mockCart = {
          user: "user123",
          items: [],
          save: jest.fn().mockResolvedValue(true),
        };
        mockCart.items.push = jest.fn();
        mockCartModel.findOne.mockResolvedValue(mockCart);

        const result = await executeOrderPlacement({
          productId: "product123",
          quantity: 5,
          userId: "user123",
          cartModel: mockCartModel,
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
