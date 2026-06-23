/**
 * Retrieval Service — Product Catalog RAG
 *
 * Retrieves relevant in-stock products from the MongoDB text index
 * for inclusion in the LLM prompt. Uses Promise.race with a 1500ms
 * timeout, falls back to popular products on error/timeout, and
 * returns an empty array if all retrieval paths fail.
 *
 * Requirements: 2.2, 2.3, 2.6, 2.7
 */

import Product from "../../models/productModel.js";

/** Maximum number of products to retrieve */
const MAX_RESULTS = 8;

/** Timeout for the primary text-index search (ms) */
const SEARCH_TIMEOUT_MS = 1500;

/** Maximum description length in formatted output */
const MAX_DESCRIPTION_LENGTH = 100;

/**
 * Retrieve up to 8 in-stock products relevant to the user query.
 *
 * Strategy:
 * 1. Run text-index search with 1500ms timeout via Promise.race
 * 2. Sort by textScore descending, limit 8, filter to in-stock only
 * 3. On timeout or error, fallback: top 8 in-stock by numReviews desc, name asc
 * 4. On fallback failure, return empty array
 *
 * @param {string} query - The user's search query
 * @returns {Promise<Array<{ _id: string, name: string, price: number, description: string, stockStatus: string }>>}
 */
export async function retrieveProducts(query) {
  try {
    const products = await withTimeout(primarySearch(query), SEARCH_TIMEOUT_MS);

    if (products && products.length > 0) {
      return formatProducts(products);
    }

    // No text-score results — try fallback
    const fallbackProducts = await fallbackSearch();
    return formatProducts(fallbackProducts);
  } catch {
    // Primary search timed out or errored — try fallback
    try {
      const fallbackProducts = await fallbackSearch();
      return formatProducts(fallbackProducts);
    } catch {
      // Fallback also failed — return empty array
      return [];
    }
  }
}

/**
 * Primary text-index search: find in-stock products matching the query,
 * sorted by textScore descending, limited to MAX_RESULTS.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching product documents
 */
async function primarySearch(query) {
  if (!query || !query.trim()) throw new Error("empty query");
  return Product.find(
    { $text: { $search: query }, countInStock: { $gt: 0 }, isAvailable: { $ne: false } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(MAX_RESULTS)
    .lean();
}

/**
 * Fallback search: top 8 in-stock products by numReviews descending,
 * with name ascending as tie-breaker.
 *
 * @returns {Promise<Array>} Popular product documents
 */
async function fallbackSearch() {
  return Product.find({ countInStock: { $gt: 0 }, isAvailable: { $ne: false } })
    .sort({ numReviews: -1, name: 1 })
    .limit(MAX_RESULTS)
    .lean();
}

/**
 * Format products for prompt inclusion.
 * Truncates description to MAX_DESCRIPTION_LENGTH characters.
 *
 * @param {Array} products - Raw product documents
 * @returns {Array<{ _id: string, name: string, price: number, description: string, stockStatus: string }>}
 */
export function formatProducts(products) {
  if (!products || !Array.isArray(products)) return [];

  return products.map((product) => ({
    _id: product._id?.toString() || "",
    name: product.name || "",
    price: product.price || 0,
    description: truncateDescription(product.description || ""),
    stockStatus: product.countInStock > 0 ? "in_stock" : "out_of_stock",
  }));
}

/**
 * Truncate a description string to the maximum allowed length.
 *
 * @param {string} description - Full description text
 * @returns {string} Truncated description (at most MAX_DESCRIPTION_LENGTH chars)
 */
export function truncateDescription(description) {
  if (!description) return "";
  if (description.length <= MAX_DESCRIPTION_LENGTH) return description;
  return description.slice(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * Wrap a promise with a timeout that cleans up after itself.
 * Uses clearTimeout to avoid open handles in tests.
 *
 * @param {Promise} promise - The promise to race against the timeout
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Resolves with the promise result or rejects on timeout
 */
function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Retrieval timeout")), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}
