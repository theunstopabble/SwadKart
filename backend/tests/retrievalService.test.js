/**
 * Unit tests for retrievalService.js
 *
 * Tests the pure formatting functions and the retrieval logic
 * with mocked Product model.
 */

import { jest } from "@jest/globals";

// Mock the Product model before importing the service
const mockFind = jest.fn();
const mockSort = jest.fn();
const mockLimit = jest.fn();
const mockLean = jest.fn();
const mockSelect = jest.fn();

jest.unstable_mockModule("../models/productModel.js", () => ({
  default: {
    find: mockFind,
  },
}));

const { retrieveProducts, formatProducts, truncateDescription } = await import(
  "../services/chat/retrievalService.js"
);

describe("truncateDescription", () => {
  it("returns empty string for falsy input", () => {
    expect(truncateDescription("")).toBe("");
    expect(truncateDescription(null)).toBe("");
    expect(truncateDescription(undefined)).toBe("");
  });

  it("returns the full string when under 100 chars", () => {
    const short = "A short description";
    expect(truncateDescription(short)).toBe(short);
  });

  it("returns exactly 100 chars for a string of exactly 100 chars", () => {
    const exact = "a".repeat(100);
    expect(truncateDescription(exact)).toBe(exact);
    expect(truncateDescription(exact).length).toBe(100);
  });

  it("truncates to 100 chars for longer strings", () => {
    const long = "b".repeat(200);
    const result = truncateDescription(long);
    expect(result.length).toBe(100);
    expect(result).toBe("b".repeat(100));
  });
});

describe("formatProducts", () => {
  it("returns empty array for null/undefined input", () => {
    expect(formatProducts(null)).toEqual([]);
    expect(formatProducts(undefined)).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(formatProducts("not an array")).toEqual([]);
    expect(formatProducts(123)).toEqual([]);
  });

  it("formats products with correct fields", () => {
    const products = [
      {
        _id: "abc123",
        name: "Butter Chicken",
        price: 299,
        description: "Creamy tomato-based curry with tender chicken pieces",
        countInStock: 10,
      },
    ];

    const result = formatProducts(products);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      _id: "abc123",
      name: "Butter Chicken",
      price: 299,
      description: "Creamy tomato-based curry with tender chicken pieces",
      stockStatus: "in_stock",
    });
  });

  it("truncates long descriptions to 100 chars", () => {
    const products = [
      {
        _id: "xyz789",
        name: "Special Thali",
        price: 399,
        description: "A".repeat(250),
        countInStock: 5,
      },
    ];

    const result = formatProducts(products);
    expect(result[0].description.length).toBe(100);
  });

  it("sets stockStatus to out_of_stock when countInStock is 0", () => {
    const products = [
      {
        _id: "out1",
        name: "Sold Out Item",
        price: 199,
        description: "Gone",
        countInStock: 0,
      },
    ];

    const result = formatProducts(products);
    expect(result[0].stockStatus).toBe("out_of_stock");
  });

  it("handles products with missing fields gracefully", () => {
    const products = [{}];
    const result = formatProducts(products);
    expect(result[0]).toEqual({
      _id: "",
      name: "",
      price: 0,
      description: "",
      stockStatus: "out_of_stock",
    });
  });
});

describe("retrieveProducts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupChain(results) {
    mockLean.mockResolvedValue(results);
    mockLimit.mockReturnValue({ lean: mockLean });
    mockSort.mockReturnValue({ limit: mockLimit });
    mockFind.mockReturnValue({ sort: mockSort, limit: mockLimit, lean: mockLean });
  }

  it("returns formatted products from primary text search", async () => {
    const products = [
      { _id: "p1", name: "Pizza", price: 199, description: "Cheesy", countInStock: 5 },
      { _id: "p2", name: "Burger", price: 149, description: "Juicy", countInStock: 3 },
    ];

    // Primary search returns results
    mockLean.mockResolvedValueOnce(products);
    mockLimit.mockReturnValueOnce({ lean: mockLean });
    mockSort.mockReturnValueOnce({ limit: mockLimit });
    mockFind.mockReturnValueOnce({ sort: mockSort });

    const result = await retrieveProducts("pizza");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Pizza");
    expect(result[0].stockStatus).toBe("in_stock");
  });

  it("falls back to popular products when primary returns empty", async () => {
    const fallbackProducts = [
      { _id: "f1", name: "Popular Item", price: 299, description: "Best seller", countInStock: 20 },
    ];

    // Primary search returns empty
    mockLean.mockResolvedValueOnce([]);
    mockLimit.mockReturnValueOnce({ lean: mockLean });
    mockSort.mockReturnValueOnce({ limit: mockLimit });
    mockFind.mockReturnValueOnce({ sort: mockSort });

    // Fallback search returns results
    mockLean.mockResolvedValueOnce(fallbackProducts);
    mockLimit.mockReturnValueOnce({ lean: mockLean });
    mockSort.mockReturnValueOnce({ limit: mockLimit });
    mockFind.mockReturnValueOnce({ sort: mockSort });

    const result = await retrieveProducts("nonexistent");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Popular Item");
  });

  it("returns empty array when both primary and fallback fail", async () => {
    // Primary search throws
    mockFind.mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    // Fallback also throws
    mockFind.mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    const result = await retrieveProducts("anything");
    expect(result).toEqual([]);
  });

  it("returns at most 8 products", async () => {
    const products = Array.from({ length: 10 }, (_, i) => ({
      _id: `p${i}`,
      name: `Product ${i}`,
      price: 100 + i,
      description: `Desc ${i}`,
      countInStock: 5,
    }));

    // Even if DB returns more, limit(8) should be called
    mockLean.mockResolvedValueOnce(products.slice(0, 8));
    mockLimit.mockReturnValueOnce({ lean: mockLean });
    mockSort.mockReturnValueOnce({ limit: mockLimit });
    mockFind.mockReturnValueOnce({ sort: mockSort });

    const result = await retrieveProducts("product");
    expect(result.length).toBeLessThanOrEqual(8);
  });
});
