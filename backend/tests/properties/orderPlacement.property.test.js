/**
 * Property 9: Order placement validates inputs and only writes to the cart when valid.
 *
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
 *
 * Feature: chatbot-enterprise-upgrade
 *
 * For any tool invocation {productId, quantity, userId} and any backing product set,
 * the order placement function writes to the cart if and only if:
 * - userId is non-null AND
 * - a product with productId exists AND
 * - quantity is an integer in [1, 10] AND
 * - quantity ≤ product.countInStock AND product.isAvailable
 * Otherwise the cart is not modified and the returned reason identifies the failed gate.
 */
import { jest } from "@jest/globals";
import fc from "fast-check";

// Mock the Product model before importing the service
const mockFindById = jest.fn();
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: {
    findById: mockFindById,
  },
}));

// Mock mongoose to avoid Cart model issues
jest.unstable_mockModule("mongoose", () => {
  const SchemaClass = function () {
    this.index = jest.fn().mockReturnThis();
  };
  SchemaClass.Types = { ObjectId: String };

  return {
    default: {
      Schema: SchemaClass,
      model: jest.fn(() => ({})),
      models: {},
    },
    Schema: SchemaClass,
  };
});

const { executeOrderPlacement } = await import(
  "../../services/chat/orderPlacementTool.js"
);

// Hex ID generator (MongoDB ObjectId-like)
const HEX_CHARS = "0123456789abcdef".split("");
const arbHexId = fc
  .array(fc.constantFrom(...HEX_CHARS), { minLength: 24, maxLength: 24 })
  .map((chars) => chars.join(""));

describe("Property 9: Order placement validates inputs and only writes to cart when ALL gates pass", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("no cart write when userId is null/empty (gate 1: auth)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexId,
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom(null, "", undefined),
        async (productId, quantity, userId) => {
          mockFindById.mockReset();
          const mockCartModel = { findOne: jest.fn() };

          const result = await executeOrderPlacement({
            productId,
            quantity,
            userId,
            cartModel: mockCartModel,
          });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("auth_required");
          // Cart should never be touched
          expect(mockCartModel.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("no cart write when product does not exist (gate 2: product existence)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexId,
        fc.integer({ min: 1, max: 10 }),
        fc.uuid(),
        async (productId, quantity, userId) => {
          mockFindById.mockReset();
          mockFindById.mockResolvedValue(null);
          const mockCartModel = { findOne: jest.fn() };

          const result = await executeOrderPlacement({
            productId,
            quantity,
            userId,
            cartModel: mockCartModel,
          });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("product_not_found");
          expect(mockCartModel.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("no cart write when quantity is not an integer in [1, 10] (gate 3: quantity range)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexId,
        fc.oneof(
          fc.constant(0),
          fc.constant(-1),
          fc.constant(11),
          fc.constant(1.5),
          fc.constant(100)
        ),
        fc.uuid(),
        async (productId, quantity, userId) => {
          mockFindById.mockReset();
          const product = {
            _id: productId,
            name: "Test",
            price: 100,
            countInStock: 50,
            isAvailable: true,
          };
          mockFindById.mockResolvedValue(product);
          const mockCartModel = { findOne: jest.fn() };

          const result = await executeOrderPlacement({
            productId,
            quantity,
            userId,
            cartModel: mockCartModel,
          });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("invalid_quantity");
          expect(mockCartModel.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("no cart write when stock is insufficient (gate 4: stock check)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexId,
        fc.integer({ min: 1, max: 10 }),
        fc.uuid(),
        async (productId, quantity, userId) => {
          mockFindById.mockReset();
          // Product exists but has 0 stock
          const product = {
            _id: productId,
            name: "Out of Stock Item",
            price: 100,
            countInStock: 0,
            isAvailable: true,
          };
          mockFindById.mockResolvedValue(product);
          const mockCartModel = { findOne: jest.fn() };

          const result = await executeOrderPlacement({
            productId,
            quantity,
            userId,
            cartModel: mockCartModel,
          });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("out_of_stock");
          expect(mockCartModel.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("cart write occurs when all gates pass (auth + product exists + valid quantity + sufficient stock)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexId,
        fc.integer({ min: 1, max: 5 }),
        fc.uuid(),
        async (productId, quantity, userId) => {
          mockFindById.mockReset();
          // Product exists with sufficient stock
          const product = {
            _id: productId,
            name: "Available Item",
            price: 199,
            countInStock: 10,
            isAvailable: true,
          };
          mockFindById.mockResolvedValue(product);

          // Mock cart model that tracks writes
          const mockSave = jest.fn().mockResolvedValue({});
          const mockCartModel = {
            findOne: jest.fn().mockResolvedValue({
              user: userId,
              items: [],
              save: mockSave,
            }),
          };

          const result = await executeOrderPlacement({
            productId,
            quantity,
            userId,
            cartModel: mockCartModel,
          });

          expect(result.success).toBe(true);
          expect(result.product.name).toBe("Available Item");
          expect(result.product.quantity).toBe(quantity);
          // Cart was accessed
          expect(mockCartModel.findOne).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });
});
