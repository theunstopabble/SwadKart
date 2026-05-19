/**
 * Tool Registry — Centralized registry for all chatbot action tools.
 *
 * Manages conditional tool inclusion based on authentication status and
 * provides a lookup function to map tool function names to their executors.
 *
 * - `buildToolRegistry({ userId })` returns an array of Groq-compatible tool
 *   schemas. The FAQ tool is always included; all other tools require an
 *   authenticated user (truthy userId).
 *
 * - `getToolExecutor(functionName)` returns the execute function for a given
 *   tool name, or null if the tool is not registered.
 *
 * Requirements: 7.1, 7.2
 */

import { toolSchema as orderPlacementSchema, executeOrderPlacement } from "../orderPlacementTool.js";
import { toolSchema as orderStatusSchema, execute as executeOrderStatus } from "./orderStatusTool.js";
import { toolSchema as orderCancelSchema, execute as executeOrderCancel } from "./orderCancelTool.js";
import { toolSchema as couponSchema, execute as executeCoupon } from "./couponTool.js";
import { toolSchema as deliveryEtaSchema, execute as executeDeliveryEta } from "./deliveryEtaTool.js";
import { toolSchema as faqSchema, execute as executeFaq } from "./faqTool.js";
import { toolSchema as reorderSchema, execute as executeReorder } from "./reorderTool.js";

/**
 * Tools that are always available regardless of authentication status.
 */
const PUBLIC_TOOLS = [
  { schema: faqSchema, executor: executeFaq },
];

/**
 * Tools that require an authenticated user (truthy userId).
 */
const AUTH_TOOLS = [
  { schema: orderPlacementSchema, executor: executeOrderPlacement },
  { schema: orderStatusSchema, executor: executeOrderStatus },
  { schema: orderCancelSchema, executor: executeOrderCancel },
  { schema: couponSchema, executor: executeCoupon },
  { schema: deliveryEtaSchema, executor: executeDeliveryEta },
  { schema: reorderSchema, executor: executeReorder },
];

/**
 * Map of function names to their execute functions for fast lookup.
 */
const executorMap = new Map();

// Register public tools
for (const tool of PUBLIC_TOOLS) {
  executorMap.set(tool.schema.function.name, tool.executor);
}

// Register auth-required tools
for (const tool of AUTH_TOOLS) {
  executorMap.set(tool.schema.function.name, tool.executor);
}

/**
 * Build the tool registry for a chat request.
 *
 * Returns an array of Groq-compatible tool schemas based on authentication
 * status. The FAQ tool is always included. All other tools are included only
 * when userId is truthy.
 *
 * @param {object} params
 * @param {string|null} params.userId - Authenticated user ID or null
 * @returns {Array} Array of Groq-compatible tool schemas
 */
export function buildToolRegistry({ userId }) {
  const tools = PUBLIC_TOOLS.map((t) => t.schema);

  if (userId) {
    for (const tool of AUTH_TOOLS) {
      tools.push(tool.schema);
    }
  }

  return tools;
}

/**
 * Get the execute function for a given tool function name.
 *
 * @param {string} functionName - The function name from the tool_call
 * @returns {Function|null} The execute function for the tool, or null if not found
 */
export function getToolExecutor(functionName) {
  return executorMap.get(functionName) || null;
}
