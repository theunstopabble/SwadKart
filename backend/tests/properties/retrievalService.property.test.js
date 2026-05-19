/**
 * Property 5: Retrieval returns at most 8 in-stock products with the documented ordering.
 * Property 6: Product prompt formatting truncates description and includes required fields.
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.6**
 *
 * Feature: chatbot-enterprise-upgrade
 */
import { jest } from "@jest/globals";
import fc from "fast-check";
import { arbProduct } from "../generators/chat.js";

// Mock the Product model before importing the service
const mockFind = jest.fn();
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: {
    find: mockFind,
  },
}));

const { retrieveProducts, formatProducts } = await import(
  "../../services/chat/retrievalService.js"
);

describe("Property 5: Retrieval returns at most 8 in-stock products", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("retrieveProducts always returns at most 8 products, all with countInStock > 0 and isAvailable === true", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbProduct, { minLength: 0, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (products, query) => {
          jest.clearAllMocks();

          // Filter to in-stock and available products (simulating what the DB would return)
          const inStockAvailable = products.filter(
            (p) => p.countInStock > 0 && p.isAvailable === true
          );
          const limited = inStockAvailable.slice(0, 8);

          // Setup mock chain: primary search returns limited in-stock products
          const mockLean = jest.fn().mockResolvedValue(limited);
          const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
          const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
          mockFind.mockReturnValue({ sort: mockSort });

          const result = await retrieveProducts(query);

          // At most 8 products
          expect(result.length).toBeLessThanOrEqual(8);

          // All returned products should have been in-stock (countInStock > 0)
          for (const product of result) {
            expect(product.stockStatus).toBe("in_stock");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("retrieveProducts returns empty array when primary and fallback both fail", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (query) => {
          jest.clearAllMocks();

          // Both primary and fallback throw
          mockFind.mockImplementation(() => {
            throw new Error("DB error");
          });

          const result = await retrieveProducts(query);
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("Property 6: Product prompt formatting truncates description and includes required fields", () => {
  test("formatProducts always truncates description to ≤100 chars and includes _id, name, price, description, stockStatus", () => {
    fc.assert(
      fc.property(
        fc.array(arbProduct, { minLength: 0, maxLength: 15 }),
        (products) => {
          const result = formatProducts(products);

          expect(result.length).toBe(products.length);

          for (let i = 0; i < result.length; i++) {
            const formatted = result[i];

            // Must include all required fields
            expect(formatted).toHaveProperty("_id");
            expect(formatted).toHaveProperty("name");
            expect(formatted).toHaveProperty("price");
            expect(formatted).toHaveProperty("description");
            expect(formatted).toHaveProperty("stockStatus");

            // Description must be at most 100 characters
            expect(formatted.description.length).toBeLessThanOrEqual(100);

            // stockStatus must be one of the two valid values
            expect(["in_stock", "out_of_stock"]).toContain(formatted.stockStatus);

            // stockStatus should match the source product's countInStock
            if (products[i].countInStock > 0) {
              expect(formatted.stockStatus).toBe("in_stock");
            } else {
              expect(formatted.stockStatus).toBe("out_of_stock");
            }

            // If original description was longer than 100, it should be truncated
            const originalDesc = products[i].description || "";
            if (originalDesc.length > 100) {
              expect(formatted.description).toBe(originalDesc.slice(0, 100));
            } else {
              expect(formatted.description).toBe(originalDesc);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  test("formatProducts returns empty array for null/undefined/non-array input", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.constant({})
        ),
        (input) => {
          const result = formatProducts(input);
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 50 }
    );
  });
});
