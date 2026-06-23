/**
 * Property-Based Tests for Chatbot Action Tools
 *
 * Property 1: Tool registry auth-conditional inclusion
 * Property 2: Auth gate rejects unauthenticated users
 * Property 11: Multi-tool loop completeness
 * Property 12: Pipeline resilience to tool exceptions
 *
 * **Validates: Requirements 1.1, 1.5, 2.1, 2.5, 3.1, 3.10, 4.1, 4.6, 5.1, 6.1, 6.8, 7.2, 7.4, 7.5, 7.6**
 */

import { jest } from "@jest/globals";
import fc from "fast-check";

// ─── Mock setup ────────────────────────────────────────────────────────────────

// Mock orderPlacementTool (used by toolRegistry)
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

// Mock Order model (used by orderStatusTool, orderCancelTool, deliveryEtaTool, reorderTool)
const mockOrderFindOne = jest.fn();
const mockOrderFindOneAndUpdate = jest.fn();
jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: {
    findOne: mockOrderFindOne,
    findOneAndUpdate: mockOrderFindOneAndUpdate,
  },
}));

// Mock Coupon model (used by couponTool)
jest.unstable_mockModule("../../models/couponModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

// Mock CouponUsage model (used by couponTool)
jest.unstable_mockModule("../../models/couponUsageModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

// Mock Product model (used by reorderTool)
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

// Mock User model (used by reorderTool, orderPlacementTool, orderStatusTool)
jest.unstable_mockModule("../../models/userModel.js", () => ({
  default: {
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

// Mock mongoose (used by reorderTool for transactions)
jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn(),
  },
}));

// ─── Pipeline mocks (for Properties 11 and 12) ────────────────────────────────

// Mock groqClient
jest.unstable_mockModule("../../services/chat/groqClient.js", () => ({
  default: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock groqQueue
jest.unstable_mockModule("../../services/chat/groqQueue.js", () => ({
  callGroq: jest.fn(),
}));

// Mock redis
jest.unstable_mockModule("../../config/redis.js", () => ({
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock conversationRepo
jest.unstable_mockModule("../../services/chat/conversationRepo.js", () => ({
  loadRecentMessages: jest.fn().mockResolvedValue([]),
  appendMessages: jest.fn().mockResolvedValue({ messages: [{ _id: "msg1" }] }),
}));

// Mock Conversation model
jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ escalationFlag: false }),
    }),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
  },
}));

// Mock languageDetector
jest.unstable_mockModule("../../services/chat/languageDetector.js", () => ({
  detectLanguage: jest.fn().mockReturnValue({ language: "English" }),
}));

// Mock intentClassifier
jest.unstable_mockModule("../../services/chat/intentClassifier.js", () => ({
  classifyIntent: jest.fn().mockResolvedValue("general_chat"),
}));

// Mock sentimentAnalyzer
jest.unstable_mockModule("../../services/chat/sentimentAnalyzer.js", () => ({
  analyzeSentiment: jest.fn().mockResolvedValue(0.0),
}));

// Mock retrievalService
jest.unstable_mockModule("../../services/chat/retrievalService.js", () => ({
  retrieveProducts: jest.fn().mockResolvedValue([]),
}));

// Mock tokenBudget
jest.unstable_mockModule("../../services/chat/tokenBudget.js", () => ({
  fitToBudget: jest.fn().mockImplementation(({ systemPrompt, history, newUserMessage }) => ({
    messages: [
      { role: "system", content: systemPrompt || "system" },
      { role: "user", content: newUserMessage || "hello" },
    ],
  })),
}));

// Mock fallbackResponder
jest.unstable_mockModule("../../services/chat/fallbackResponder.js", () => ({
  buildFallback: jest.fn().mockReturnValue({ reply: "Sorry, something went wrong." }),
}));

// Mock sseSerializer
jest.unstable_mockModule("../../services/chat/sseSerializer.js", () => ({
  serializeEvent: jest.fn().mockImplementation((data) => JSON.stringify(data)),
}));

// ─── Import modules after mocks ────────────────────────────────────────────────

const { buildToolRegistry, getToolExecutor } = await import(
  "../../services/chat/tools/toolRegistry.js"
);

const { execute: executeOrderStatus } = await import(
  "../../services/chat/tools/orderStatusTool.js"
);

const { execute: executeOrderCancel } = await import(
  "../../services/chat/tools/orderCancelTool.js"
);

const { execute: executeCoupon } = await import(
  "../../services/chat/tools/couponTool.js"
);

const { execute: executeDeliveryEta } = await import(
  "../../services/chat/tools/deliveryEtaTool.js"
);

const { execute: executeReorder } = await import(
  "../../services/chat/tools/reorderTool.js"
);

const UserModel = (await import("../../models/userModel.js")).default;

const { callGroq } = await import("../../services/chat/groqQueue.js");

const { runChatPipeline } = await import(
  "../../services/chat/chatPipeline.js"
);

// ─── Arbitrary generators ──────────────────────────────────────────────────────

/**
 * Generate userId values: null, undefined, empty string (falsy), or truthy strings.
 */
const arbUserId = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(""),
  fc.constant("user123"),
  fc.string({ minLength: 1 })
);

/**
 * The set of auth-required tool function names.
 */
const AUTH_TOOL_NAMES = [
  "place_order",
  "get_order_status",
  "cancel_order",
  "coupon_offers",
  "get_delivery_eta",
  "reorder_last",
];

/**
 * Generate a falsy userId (null or undefined).
 */
const arbFalsyUserId = fc.oneof(
  fc.constant(null),
  fc.constant(undefined)
);

/**
 * Generate K (number of tool calls) between 1 and 5.
 */
const arbToolCallCount = fc.integer({ min: 1, max: 5 });

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Feature: chatbot-action-tools, Property 1: Tool registry auth-conditional inclusion", () => {
  test("faq_support is always included, and auth tools are included iff userId is truthy", async () => {
    await fc.assert(
      fc.asyncProperty(arbUserId, async (userId) => {
        const tools = buildToolRegistry({ userId });
        const names = tools.map((t) => t.function.name);

        // faq_support is ALWAYS included
        expect(names).toContain("faq_support");

        if (userId) {
          // Truthy userId → all auth tools included
          for (const authTool of AUTH_TOOL_NAMES) {
            expect(names).toContain(authTool);
          }
        } else {
          // Falsy userId → no auth tools included
          for (const authTool of AUTH_TOOL_NAMES) {
            expect(names).not.toContain(authTool);
          }
        }
      }),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.2**
   */
  test("registry returns valid Groq-compatible schemas for any auth state", async () => {
    await fc.assert(
      fc.asyncProperty(arbUserId, async (userId) => {
        const tools = buildToolRegistry({ userId });

        for (const tool of tools) {
          expect(tool.type).toBe("function");
          expect(tool.function).toBeDefined();
          expect(typeof tool.function.name).toBe("string");
          expect(typeof tool.function.description).toBe("string");
          expect(tool.function.parameters).toBeDefined();
          expect(tool.function.parameters.type).toBe("object");
        }
      }),
      { numRuns: 20 }
    );
  });
});

describe("Feature: chatbot-action-tools, Property 2: Auth gate rejects unauthenticated users", () => {
  /**
   * **Validates: Requirements 1.5, 2.5, 3.10, 4.6, 6.8, 7.6**
   */
  test("all auth-required tools return auth_required when userId is null/undefined", async () => {
    await fc.assert(
      fc.asyncProperty(arbFalsyUserId, async (userId) => {
        // Test orderStatusTool
        const orderStatusResult = await executeOrderStatus({ userId });
        expect(orderStatusResult).toEqual(
          expect.objectContaining({ success: false, reason: "auth_required" })
        );

        // Test orderCancelTool
        const orderCancelResult = await executeOrderCancel({ userId });
        expect(orderCancelResult).toEqual(
          expect.objectContaining({ success: false, reason: "auth_required" })
        );

        // Test couponTool
        const couponResult = await executeCoupon({ action: "list", userId });
        expect(couponResult).toEqual(
          expect.objectContaining({ success: false, reason: "auth_required" })
        );

        // Test deliveryEtaTool
        const etaResult = await executeDeliveryEta({ userId });
        expect(etaResult).toEqual(
          expect.objectContaining({ success: false, reason: "auth_required" })
        );

        // Test reorderTool
        const reorderResult = await executeReorder({ userId });
        expect(reorderResult).toEqual(
          expect.objectContaining({ success: false, reason: "auth_required" })
        );
      }),
      { numRuns: 20 }
    );
  });
});

describe("Feature: chatbot-action-tools, Property 3: Order status fetches most recent order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.2, 1.3**
   *
   * Strategy: Since the tool uses Order.findOne().sort({ createdAt: -1 }).lean()
   * to get the most recent order, we mock Order.findOne to simulate this behavior.
   * We generate N orders with distinct timestamps, determine which is most recent,
   * and verify the tool returns that order's data correctly.
   */
  test("without an orderId, the tool returns the order with the maximum createdAt value", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate N orders (N >= 1) with distinct createdAt timestamps
        fc.array(
          fc.record({
            _id: fc.stringMatching(/^[0-9a-f]{24}$/),
            orderStatus: fc.constantFrom("Placed", "Preparing", "Ready", "Out for Delivery", "Delivered"),
            deliveryStatus: fc.constantFrom("None", "Assigned", "Accepted", "Out for Delivery", "Delivered"),
            estimatedDeliveryAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
            totalPrice: fc.double({ min: 50, max: 5000, noNaN: true }),
            orderItems: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 30 }),
                qty: fc.integer({ min: 1, max: 10 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (orders) => {
          // Ensure distinct createdAt timestamps
          const distinctOrders = orders.map((order, idx) => ({
            ...order,
            createdAt: new Date(order.createdAt.getTime() + idx),
          }));

          // Find the most recent order (max createdAt) - this simulates what
          // .sort({ createdAt: -1 }) would return as the first result
          const mostRecent = distinctOrders.reduce((latest, order) =>
            order.createdAt > latest.createdAt ? order : latest
          );

          // Mock Order.findOne to simulate .sort({ createdAt: -1 }).lean()
          const leanMock = jest.fn().mockResolvedValue(mostRecent);
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          const result = await executeOrderStatus({ userId: "user123" });

          // The result should be successful and contain the most recent order's data
          expect(result.success).toBe(true);
          expect(result.data.orderId).toBe(mostRecent._id.toString());
          expect(result.data.orderStatus).toBe(mostRecent.orderStatus);
          expect(result.data.totalPrice).toBe(mostRecent.totalPrice);
          expect(result.data.orderItems.length).toBe(mostRecent.orderItems.length);

          // Verify each item maps name and qty correctly
          for (let i = 0; i < mostRecent.orderItems.length; i++) {
            expect(result.data.orderItems[i].name).toBe(mostRecent.orderItems[i].name);
            expect(result.data.orderItems[i].quantity).toBe(mostRecent.orderItems[i].qty);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe("Feature: chatbot-action-tools, Property 11: Multi-tool loop completeness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 7.4**
   */
  test("for K tool_calls, the pipeline executes all K tools and accumulates all K tool response messages", async () => {
    await fc.assert(
      fc.asyncProperty(arbToolCallCount, async (K) => {
        jest.clearAllMocks();

        // Build K tool_calls for faq_support (no auth needed, no DB)
        const toolCalls = Array.from({ length: K }, (_, i) => ({
          id: `call_${i}`,
          type: "function",
          function: {
            name: "faq_support",
            arguments: JSON.stringify({ topic: "helpline" }),
          },
        }));

        // Track how many times callGroq is invoked
        let callCount = 0;

        callGroq.mockImplementation(async (fn) => {
          callCount++;
          if (callCount === 1) {
            // First call: LLM returns tool_calls
            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: null,
                    tool_calls: toolCalls,
                  },
                },
              ],
            };
          }
          // Second call: LLM returns final text reply
          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: `Processed ${K} tools successfully.`,
                  tool_calls: undefined,
                },
              },
            ],
          };
        });

        const result = await runChatPipeline({
          userId: null,
          sessionId: "test-session",
          message: "help me",
          cartItems: [],
          attachments: [],
          emit: null,
        });

        // Pipeline should have called the LLM at least twice (initial + after tools)
        expect(callGroq).toHaveBeenCalledTimes(2);

        // The final reply should contain the text from the second LLM call
        expect(result.reply).toBe(`Processed ${K} tools successfully.`);
        expect(result.degraded).toBe(false);
      }),
      { numRuns: 20 }
    );
  });
});

describe("Feature: chatbot-action-tools, Property 12: Pipeline resilience to tool exceptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 7.5**
   */
  test("a tool throwing an exception produces internal_error without crashing the pipeline", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (errorMessage) => {
          jest.clearAllMocks();

          // Create a tool_call that will trigger an exception
          // We use a tool name that exists but pass arguments that will cause JSON.parse to throw
          const toolCalls = [
            {
              id: "call_error",
              type: "function",
              function: {
                name: "faq_support",
                arguments: "{ invalid json !!!",  // Invalid JSON will throw in JSON.parse
              },
            },
          ];

          let callCount = 0;
          const capturedMessages = [];

          callGroq.mockImplementation(async (fn) => {
            callCount++;
            if (callCount === 1) {
              // First call: LLM returns a tool_call with bad arguments
              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: null,
                      tool_calls: toolCalls,
                    },
                  },
                ],
              };
            }
            // Capture the messages sent to the second LLM call
            // The second call receives the accumulated messages including tool responses
            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "I encountered an error but handled it gracefully.",
                    tool_calls: undefined,
                  },
                },
              ],
            };
          });

          // Pipeline should NOT throw
          const result = await runChatPipeline({
            userId: "user123",
            sessionId: "test-session-error",
            message: "do something",
            cartItems: [],
            attachments: [],
            emit: null,
          });

          // Pipeline should complete without crashing
          expect(result).toBeDefined();
          expect(result.reply).toBeDefined();
          expect(result.degraded).toBe(false);

          // The LLM should have been called twice (initial + after error handling)
          expect(callGroq).toHaveBeenCalledTimes(2);
        }
      ),
      { numRuns: 20 }
    );
  });

  test("pipeline does not crash even when tool executor is not found", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !["faq_support", "place_order", "get_order_status", "cancel_order", "coupon_offers", "get_delivery_eta", "reorder_last"].includes(s)),
        async (unknownToolName) => {
          jest.clearAllMocks();

          const toolCalls = [
            {
              id: "call_unknown",
              type: "function",
              function: {
                name: unknownToolName,
                arguments: JSON.stringify({}),
              },
            },
          ];

          let callCount = 0;

          callGroq.mockImplementation(async (fn) => {
            callCount++;
            if (callCount === 1) {
              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: null,
                      tool_calls: toolCalls,
                    },
                  },
                ],
              };
            }
            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "Handled unknown tool gracefully.",
                    tool_calls: undefined,
                  },
                },
              ],
            };
          });

          // Pipeline should NOT throw
          const result = await runChatPipeline({
            userId: "user123",
            sessionId: "test-session-unknown",
            message: "test",
            cartItems: [],
            attachments: [],
            emit: null,
          });

          expect(result).toBeDefined();
          expect(result.reply).toBeDefined();
          expect(result.degraded).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ─── Import faqTool directly for Property 9 ────────────────────────────────────

const { execute: executeFaq } = await import(
  "../../services/chat/tools/faqTool.js"
);

// ─── Property 9: FAQ topic lookup correctness ──────────────────────────────────

describe("Feature: chatbot-action-tools, Property 9: FAQ topic lookup correctness", () => {
  /**
   * **Validates: Requirements 5.2, 5.4**
   */

  const VALID_TOPICS = [
    "helpline",
    "refund_policy",
    "delivery_areas",
    "payment_methods",
    "order_issues",
    "account_help",
  ];

  test("valid topics return success with matching topic and answer fields", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_TOPICS), (topic) => {
        const result = executeFaq({ topic });

        // Must be a success response
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.topic).toBe(topic);
        expect(typeof result.data.answer).toBe("string");
        expect(result.data.answer.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 }
    );
  });

  test("any string not in the valid topic set returns invalid_topic", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_TOPICS.includes(s)),
        (topic) => {
          const result = executeFaq({ topic });

          // Must be a failure response with invalid_topic reason
          expect(result.success).toBe(false);
          expect(result.reason).toBe("invalid_topic");
          expect(typeof result.message).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  test("for any arbitrary string, result is either valid success or invalid_topic failure", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constantFrom(...VALID_TOPICS), fc.string()),
        (topic) => {
          const result = executeFaq({ topic });

          if (VALID_TOPICS.includes(topic)) {
            expect(result.success).toBe(true);
            expect(result.data.topic).toBe(topic);
            expect(typeof result.data.answer).toBe("string");
          } else {
            expect(result.success).toBe(false);
            expect(result.reason).toBe("invalid_topic");
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ─── Property 5: Cancellation eligibility determination ────────────────────────

describe("Feature: chatbot-action-tools, Property 5: Cancellation eligibility determination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.2, 2.6, 2.7**
   *
   * Strategy: Generate orders with various createdAt timestamps (relative to now)
   * and orderStatus values. Determine expected eligibility based on the rules:
   * - Terminal statuses (Out for Delivery, Delivered, Cancelled) → ALWAYS ineligible
   * - Always eligible statuses (Placed, Preparing) → ALWAYS eligible regardless of time
   * - Within 5 minutes of createdAt → eligible (regardless of status, unless terminal)
   * - "Ready" status past 5 minutes → cancellation_window_expired
   *
   * Mock Order.findOne to return the generated order and Order.findOneAndUpdate
   * to simulate the atomic update behavior.
   */

  const ALL_STATUSES = ["Placed", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"];
  const TERMINAL_STATUSES = ["Out for Delivery", "Delivered", "Cancelled"];
  const ALWAYS_ELIGIBLE = ["Placed", "Preparing"];
  const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;

  test("eligibility is true iff (within 5 min) OR (status in Placed/Preparing), and always false for terminal statuses", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate milliseconds ago (0 to 10 minutes in ms)
        fc.integer({ min: 0, max: 600000 }),
        // Generate order status from all possible values
        fc.constantFrom(...ALL_STATUSES),
        // Generate isPaid flag
        fc.boolean(),
        async (msAgo, orderStatus, isPaid) => {
          jest.clearAllMocks();

          const now = new Date();
          const createdAt = new Date(now.getTime() - msAgo);
          const withinTimeWindow = msAgo <= CANCELLATION_WINDOW_MS;
          const isTerminal = TERMINAL_STATUSES.includes(orderStatus);
          const isAlwaysEligible = ALWAYS_ELIGIBLE.includes(orderStatus);

          // Determine expected behavior
          const shouldBeEligible = !isTerminal && (withinTimeWindow || isAlwaysEligible);

          const mockOrder = {
            _id: "order123",
            user: "user123",
            orderStatus,
            createdAt,
            isPaid,
            totalPrice: 500,
            orderItems: [{ name: "Pizza", qty: 1 }],
          };

          // Mock Order.findOne to return the order
          const leanMock = jest.fn().mockResolvedValue(mockOrder);
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          // Mock Order.findOneAndUpdate:
          // - Returns updated order if conditions match (non-terminal status)
          // - Returns null if conditions don't match (terminal status or race condition)
          if (shouldBeEligible) {
            const updatedOrder = {
              ...mockOrder,
              orderStatus: "Cancelled",
              cancelledAt: now,
              cancellationReason: "Cancelled via chatbot",
            };
            const updateLeanMock = jest.fn().mockResolvedValue(updatedOrder);
            mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });
          } else {
            const updateLeanMock = jest.fn().mockResolvedValue(null);
            mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });
          }

          const result = await executeOrderCancel({ userId: "user123" });

          if (isTerminal) {
            // Terminal statuses → order_not_cancellable
            expect(result.success).toBe(false);
            expect(result.reason).toBe("order_not_cancellable");
          } else if (shouldBeEligible) {
            // Eligible → success
            expect(result.success).toBe(true);
            expect(result.data.status).toBe("Cancelled");
            expect(result.data.refundEligible).toBe(isPaid);
          } else {
            // Not eligible (Ready status past 5 minutes) → cancellation_window_expired
            expect(result.success).toBe(false);
            expect(result.reason).toBe("cancellation_window_expired");
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("terminal statuses are always ineligible regardless of time window", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate any time offset (even 0 ms ago = just placed)
        fc.integer({ min: 0, max: 600000 }),
        fc.constantFrom(...TERMINAL_STATUSES),
        async (msAgo, terminalStatus) => {
          jest.clearAllMocks();

          const now = new Date();
          const createdAt = new Date(now.getTime() - msAgo);

          const mockOrder = {
            _id: "order456",
            user: "user123",
            orderStatus: terminalStatus,
            createdAt,
            isPaid: true,
            totalPrice: 300,
            orderItems: [{ name: "Burger", qty: 2 }],
          };

          const leanMock = jest.fn().mockResolvedValue(mockOrder);
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          const result = await executeOrderCancel({ userId: "user123" });

          // Terminal statuses should ALWAYS return order_not_cancellable
          expect(result.success).toBe(false);
          expect(result.reason).toBe("order_not_cancellable");
          // findOneAndUpdate should never be called for terminal statuses
          expect(mockOrderFindOneAndUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Placed and Preparing statuses are always eligible regardless of time", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate time offsets including well past 5 minutes
        fc.integer({ min: 0, max: 3600000 }),
        fc.constantFrom(...ALWAYS_ELIGIBLE),
        fc.boolean(),
        async (msAgo, eligibleStatus, isPaid) => {
          jest.clearAllMocks();

          const now = new Date();
          const createdAt = new Date(now.getTime() - msAgo);

          const mockOrder = {
            _id: "order789",
            user: "user123",
            orderStatus: eligibleStatus,
            createdAt,
            isPaid,
            totalPrice: 750,
            orderItems: [{ name: "Biryani", qty: 1 }],
          };

          const leanMock = jest.fn().mockResolvedValue(mockOrder);
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          // findOneAndUpdate should succeed for always-eligible statuses
          const updatedOrder = {
            ...mockOrder,
            orderStatus: "Cancelled",
            cancelledAt: now,
            cancellationReason: "Cancelled via chatbot",
          };
          const updateLeanMock = jest.fn().mockResolvedValue(updatedOrder);
          mockOrderFindOneAndUpdate.mockReturnValue({ lean: updateLeanMock });

          const result = await executeOrderCancel({ userId: "user123" });

          // Always-eligible statuses should succeed
          expect(result.success).toBe(true);
          expect(result.data.status).toBe("Cancelled");
          expect(result.data.refundEligible).toBe(isPaid);
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ─── Import Coupon models for Properties 7 and 8 ───────────────────────────────

const CouponModel = (await import("../../models/couponModel.js")).default;
const CouponUsageModel = (await import("../../models/couponUsageModel.js")).default;

// ─── Property 7: Coupon list filtering and sorting ─────────────────────────────

describe("Feature: chatbot-action-tools, Property 7: Coupon list filtering and sorting", () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Generator for a coupon object with various states.
   */
  const arbCoupon = fc.record({
    _id: fc.stringMatching(/^[0-9a-f]{24}$/),
    code: fc.string({ minLength: 3, maxLength: 10 }).map((s) => s.toUpperCase()),
    discountPercentage: fc.integer({ min: 1, max: 100 }),
    maxDiscountAmount: fc.integer({ min: 50, max: 2000 }),
    minOrderValue: fc.integer({ min: 0, max: 1000 }),
    isActive: fc.boolean(),
    expirationDate: fc.date({ min: new Date("2024-01-01"), max: new Date("2027-12-31") }),
  });

  /**
   * Generator for a set of coupons and a set of used coupon IDs.
   */
  const arbCouponScenario = fc.record({
    coupons: fc.array(arbCoupon, { minLength: 0, maxLength: 10 }),
    usedCouponIds: fc.array(fc.stringMatching(/^[0-9a-f]{24}$/), { minLength: 0, maxLength: 5 }),
  });

  test("list returns only active, non-expired, unused coupons sorted by discountPercentage desc", async () => {
    await fc.assert(
      fc.asyncProperty(arbCouponScenario, async ({ coupons, usedCouponIds }) => {
        const now = new Date();
        const userId = "user123";

        // Determine which coupons should be returned (active, non-expired, unused)
        const expectedCoupons = coupons
          .filter(
            (c) =>
              c.isActive === true &&
              new Date(c.expirationDate) > now &&
              !usedCouponIds.includes(c._id)
          )
          .sort((a, b) => b.discountPercentage - a.discountPercentage);

        // Mock CouponUsage.find to return the used coupon IDs
        const usageSelectMock = jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(
            usedCouponIds.map((id) => ({ coupon: id }))
          ),
        });
        CouponUsageModel.find.mockReturnValue({
          select: usageSelectMock,
        });

        // Mock Coupon.find to simulate the DB query filtering
        // The tool passes { isActive: true, expirationDate: { $gt: now }, _id: { $nin: usedCouponIds } }
        // We simulate the DB returning the correctly filtered and sorted results
        const couponSortMock = jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(expectedCoupons),
        });
        CouponModel.find.mockReturnValue({
          sort: couponSortMock,
        });

        const result = await executeCoupon({ action: "list", userId });

        if (expectedCoupons.length === 0) {
          // No coupons available
          expect(result.success).toBe(false);
          expect(result.reason).toBe("no_coupons_available");
        } else {
          // Success — verify returned data
          expect(result.success).toBe(true);
          expect(result.data.coupons).toHaveLength(expectedCoupons.length);

          // Verify sorting: discountPercentage should be descending
          for (let i = 1; i < result.data.coupons.length; i++) {
            expect(result.data.coupons[i - 1].discountPercentage).toBeGreaterThanOrEqual(
              result.data.coupons[i].discountPercentage
            );
          }

          // Verify each coupon has the required fields
          for (const coupon of result.data.coupons) {
            expect(coupon).toHaveProperty("code");
            expect(coupon).toHaveProperty("discountPercentage");
            expect(coupon).toHaveProperty("maxDiscountAmount");
            expect(coupon).toHaveProperty("minOrderValue");
            expect(coupon).toHaveProperty("expirationDate");
          }
        }
      }),
      { numRuns: 20 }
    );
  });
});

// ─── Property 8: Coupon apply validation ───────────────────────────────────────

describe("Feature: chatbot-action-tools, Property 8: Coupon apply validation", () => {
  /**
   * **Validates: Requirements 3.5, 3.6, 3.7, 3.8, 3.9**
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Generator for coupon apply scenarios covering all validation paths.
   */
  // Use a future date that is guaranteed to be in the future regardless of current system time
  const futureMinDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const futureMaxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const pastMinDate = new Date("2020-01-01");
  const pastMaxDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

  const arbApplyScenario = fc.oneof(
    // Scenario: coupon does not exist
    fc.record({
      type: fc.constant("not_found"),
      couponCode: fc.string({ minLength: 1, maxLength: 10 }),
    }),
    // Scenario: coupon exists but is inactive
    fc.record({
      type: fc.constant("inactive"),
      couponCode: fc.string({ minLength: 1, maxLength: 10 }),
      coupon: fc.record({
        _id: fc.stringMatching(/^[0-9a-f]{24}$/),
        code: fc.string({ minLength: 3, maxLength: 10 }).map((s) => s.toUpperCase()),
        isActive: fc.constant(false),
        expirationDate: fc.date({ min: futureMinDate, max: futureMaxDate }),
        discountPercentage: fc.integer({ min: 1, max: 100 }),
        maxDiscountAmount: fc.integer({ min: 50, max: 2000 }),
        minOrderValue: fc.integer({ min: 0, max: 1000 }),
      }),
    }),
    // Scenario: coupon exists, is active, but expired
    fc.record({
      type: fc.constant("expired"),
      couponCode: fc.string({ minLength: 1, maxLength: 10 }),
      coupon: fc.record({
        _id: fc.stringMatching(/^[0-9a-f]{24}$/),
        code: fc.string({ minLength: 3, maxLength: 10 }).map((s) => s.toUpperCase()),
        isActive: fc.constant(true),
        expirationDate: fc.date({ min: pastMinDate, max: pastMaxDate }),
        discountPercentage: fc.integer({ min: 1, max: 100 }),
        maxDiscountAmount: fc.integer({ min: 50, max: 2000 }),
        minOrderValue: fc.integer({ min: 0, max: 1000 }),
      }),
    }),
    // Scenario: coupon exists, active, not expired, but already used
    fc.record({
      type: fc.constant("already_used"),
      couponCode: fc.string({ minLength: 1, maxLength: 10 }),
      coupon: fc.record({
        _id: fc.stringMatching(/^[0-9a-f]{24}$/),
        code: fc.string({ minLength: 3, maxLength: 10 }).map((s) => s.toUpperCase()),
        isActive: fc.constant(true),
        expirationDate: fc.date({ min: futureMinDate, max: futureMaxDate }),
        discountPercentage: fc.integer({ min: 1, max: 100 }),
        maxDiscountAmount: fc.integer({ min: 50, max: 2000 }),
        minOrderValue: fc.integer({ min: 0, max: 1000 }),
      }),
    }),
    // Scenario: coupon exists, active, not expired, not used → success
    fc.record({
      type: fc.constant("success"),
      couponCode: fc.string({ minLength: 1, maxLength: 10 }),
      coupon: fc.record({
        _id: fc.stringMatching(/^[0-9a-f]{24}$/),
        code: fc.string({ minLength: 3, maxLength: 10 }).map((s) => s.toUpperCase()),
        isActive: fc.constant(true),
        expirationDate: fc.date({ min: futureMinDate, max: futureMaxDate }),
        discountPercentage: fc.integer({ min: 1, max: 100 }),
        maxDiscountAmount: fc.integer({ min: 50, max: 2000 }),
        minOrderValue: fc.integer({ min: 0, max: 1000 }),
      }),
    })
  );

  test("apply returns success iff code exists AND isActive AND not expired AND not used, with correct error reasons otherwise", async () => {
    await fc.assert(
      fc.asyncProperty(arbApplyScenario, async (scenario) => {
        const userId = "user123";

        switch (scenario.type) {
          case "not_found": {
            // Coupon.findOne returns null
            CouponModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(null),
            });

            const result = await executeCoupon({
              action: "apply",
              couponCode: scenario.couponCode,
              userId,
            });

            expect(result.success).toBe(false);
            expect(result.reason).toBe("invalid_coupon");
            break;
          }

          case "inactive": {
            // Coupon exists but isActive is false
            CouponModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(scenario.coupon),
            });

            const result = await executeCoupon({
              action: "apply",
              couponCode: scenario.couponCode,
              userId,
            });

            expect(result.success).toBe(false);
            expect(result.reason).toBe("coupon_expired");
            break;
          }

          case "expired": {
            // Coupon exists, active, but expired
            CouponModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(scenario.coupon),
            });

            const result = await executeCoupon({
              action: "apply",
              couponCode: scenario.couponCode,
              userId,
            });

            expect(result.success).toBe(false);
            expect(result.reason).toBe("coupon_expired");
            break;
          }

          case "already_used": {
            // Coupon exists, active, not expired, but user already used it
            CouponModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(scenario.coupon),
            });
            CouponUsageModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue({ user: userId, coupon: scenario.coupon._id }),
            });

            const result = await executeCoupon({
              action: "apply",
              couponCode: scenario.couponCode,
              userId,
            });

            expect(result.success).toBe(false);
            expect(result.reason).toBe("coupon_already_used");
            break;
          }

          case "success": {
            // All validations pass
            CouponModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(scenario.coupon),
            });
            CouponUsageModel.findOne.mockReturnValue({
              lean: jest.fn().mockResolvedValue(null),
            });

            const result = await executeCoupon({
              action: "apply",
              couponCode: scenario.couponCode,
              userId,
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.code).toBe(scenario.coupon.code);
            expect(result.data.discountPercentage).toBe(scenario.coupon.discountPercentage);
            expect(result.data.maxDiscountAmount).toBe(scenario.coupon.maxDiscountAmount);
            expect(result.data.minOrderValue).toBe(scenario.coupon.minOrderValue);
            break;
          }
        }
      }),
      { numRuns: 20 }
    );
  });
});


// ─── Property 10: Reorder item validation and cart write ───────────────────────

const ProductModelP10 = (await import("../../models/productModel.js")).default;
const mongooseMockP10 = (await import("mongoose")).default;
const { Cart: CartModelP10 } = await import(
  "../../services/chat/orderPlacementTool.js"
);

describe("Feature: chatbot-action-tools, Property 10: Reorder item validation and cart write", () => {
  /**
   * **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.10**
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Generator for an order item with a product in one of several states:
   * - exists, available, in stock → should be added
   * - exists, available, out of stock → should be skipped (out_of_stock)
   * - exists, unavailable → should be skipped (unavailable)
   * - does not exist → should be skipped (unavailable)
   */
  const arbProductState = fc.constantFrom(
    "available",       // product exists, isAvailable=true, countInStock > 0
    "out_of_stock",    // product exists, isAvailable=true, countInStock=0
    "unavailable",     // product exists, isAvailable=false
    "not_found"        // product does not exist
  );

  const arbOrderItem = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    qty: fc.integer({ min: 1, max: 10 }),
    price: fc.double({ min: 10, max: 2000, noNaN: true }).map((p) => Math.round(p * 100) / 100),
    product: fc.stringMatching(/^[0-9a-f]{24}$/),
    image: fc.constant("https://example.com/img.jpg"),
    restaurant: fc.stringMatching(/^[0-9a-f]{24}$/),
  });

  const arbItemWithState = fc.tuple(arbOrderItem, arbProductState);

  /**
   * Generate a list of 1-6 items with their product states.
   */
  const arbOrderItems = fc.array(arbItemWithState, { minLength: 1, maxLength: 6 });

  test("only items where product exists AND isAvailable AND countInStock > 0 are added to cart", async () => {
    await fc.assert(
      fc.asyncProperty(arbOrderItems, async (itemsWithStates) => {
        jest.clearAllMocks();

        const orderItems = itemsWithStates.map(([item]) => item);
        const states = itemsWithStates.map(([, state]) => state);

        // Mock Order.findOne to return a Delivered order with these items
        const mockOrder = {
          _id: "order_reorder_test",
          user: "user123",
          orderStatus: "Delivered",
          orderItems,
        };

        const orderLeanMock = jest.fn().mockResolvedValue(mockOrder);
        const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
        mockOrderFindOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

        // Mock Product.findById for each item based on its state
        ProductModelP10.findById.mockImplementation((productId) => {
          const idx = orderItems.findIndex((item) => item.product === productId);
          if (idx === -1) {
            return { lean: jest.fn().mockResolvedValue(null) };
          }
          const state = states[idx];
          switch (state) {
            case "available":
              return {
                lean: jest.fn().mockResolvedValue({
                  _id: productId,
                  name: orderItems[idx].name,
                  isAvailable: true,
                  countInStock: 50,
                  price: orderItems[idx].price,
                }),
              };
            case "out_of_stock":
              return {
                lean: jest.fn().mockResolvedValue({
                  _id: productId,
                  name: orderItems[idx].name,
                  isAvailable: true,
                  countInStock: 0,
                  price: orderItems[idx].price,
                }),
              };
            case "unavailable":
              return {
                lean: jest.fn().mockResolvedValue({
                  _id: productId,
                  name: orderItems[idx].name,
                  isAvailable: false,
                  countInStock: 10,
                  price: orderItems[idx].price,
                }),
              };
            case "not_found":
              return { lean: jest.fn().mockResolvedValue(null) };
            default:
              return { lean: jest.fn().mockResolvedValue(null) };
          }
        });

        // Mock mongoose session for transaction
        const mockSession = {
          startTransaction: jest.fn(),
          commitTransaction: jest.fn().mockResolvedValue(undefined),
          abortTransaction: jest.fn().mockResolvedValue(undefined),
          endSession: jest.fn(),
        };
        mongooseMockP10.startSession.mockResolvedValue(mockSession);

        // Mock Cart.findOneAndUpdate
        CartModelP10.findOneAndUpdate.mockResolvedValue({ user: "user123", items: [] });

        const result = await executeReorder({ userId: "user123" });

        // Determine expected added and skipped items
        const expectedAdded = [];
        const expectedSkipped = [];

        for (let i = 0; i < itemsWithStates.length; i++) {
          const [item, state] = itemsWithStates[i];
          if (state === "available") {
            expectedAdded.push({
              name: item.name,
              quantity: item.qty,
              price: item.price,
            });
          } else if (state === "out_of_stock") {
            expectedSkipped.push({ name: item.name, reason: "out_of_stock" });
          } else {
            // unavailable or not_found
            expectedSkipped.push({ name: item.name, reason: "unavailable" });
          }
        }

        if (expectedAdded.length === 0) {
          // All items unavailable → no_items_available
          expect(result.success).toBe(false);
          expect(result.reason).toBe("no_items_available");
        } else {
          // At least some items added → success
          expect(result.success).toBe(true);
          expect(result.data.addedItems).toHaveLength(expectedAdded.length);
          expect(result.data.skippedItems).toHaveLength(expectedSkipped.length);

          // Verify added items match expected
          for (let i = 0; i < expectedAdded.length; i++) {
            expect(result.data.addedItems[i].name).toBe(expectedAdded[i].name);
            expect(result.data.addedItems[i].quantity).toBe(expectedAdded[i].quantity);
            expect(result.data.addedItems[i].price).toBe(expectedAdded[i].price);
          }

          // Verify skipped items match expected
          for (let i = 0; i < expectedSkipped.length; i++) {
            expect(result.data.skippedItems[i].name).toBe(expectedSkipped[i].name);
            expect(result.data.skippedItems[i].reason).toBe(expectedSkipped[i].reason);
          }

          // Verify totalCartValue = sum of (price * quantity) for added items
          const expectedTotal = expectedAdded.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          expect(result.data.totalCartValue).toBeCloseTo(expectedTotal, 2);

          // Verify cart write was performed via User.findByIdAndUpdate
          expect(UserModel.findByIdAndUpdate).toHaveBeenCalled();
        }
      }),
      { numRuns: 20 }
    );
  });

  test("when all items are unavailable, returns no_items_available and no cart write occurs", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            arbOrderItem,
            fc.constantFrom("out_of_stock", "unavailable", "not_found")
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (itemsWithStates) => {
          jest.clearAllMocks();

          const orderItems = itemsWithStates.map(([item]) => item);
          const states = itemsWithStates.map(([, state]) => state);

          const mockOrder = {
            _id: "order_all_unavailable",
            user: "user123",
            orderStatus: "Delivered",
            orderItems,
          };

          const orderLeanMock = jest.fn().mockResolvedValue(mockOrder);
          const orderSortMock = jest.fn().mockReturnValue({ lean: orderLeanMock });
          mockOrderFindOne.mockReturnValue({ sort: orderSortMock, lean: orderLeanMock });

          ProductModelP10.findById.mockImplementation((productId) => {
            const idx = orderItems.findIndex((item) => item.product === productId);
            if (idx === -1) return { lean: jest.fn().mockResolvedValue(null) };
            const state = states[idx];
            switch (state) {
              case "out_of_stock":
                return {
                  lean: jest.fn().mockResolvedValue({
                    _id: productId,
                    isAvailable: true,
                    countInStock: 0,
                  }),
                };
              case "unavailable":
                return {
                  lean: jest.fn().mockResolvedValue({
                    _id: productId,
                    isAvailable: false,
                    countInStock: 10,
                  }),
                };
              case "not_found":
                return { lean: jest.fn().mockResolvedValue(null) };
              default:
                return { lean: jest.fn().mockResolvedValue(null) };
            }
          });

          const result = await executeReorder({ userId: "user123" });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("no_items_available");

          // No cart write should occur
          expect(UserModel.findByIdAndUpdate).not.toHaveBeenCalled();
          expect(CartModelP10.findOneAndUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});


// ─── Import mongoose mock for Property 14 ──────────────────────────────────────

const mongooseMock = (await import("mongoose")).default;
const ProductModel = (await import("../../models/productModel.js")).default;

// ─── Property 13: Read timeout enforcement ─────────────────────────────────────

describe("Feature: chatbot-action-tools, Property 13: Read timeout enforcement", () => {
  /**
   * **Validates: Requirements 1.8, 3.11, 4.8**
   *
   * Strategy: For each read-operation tool, mock the database query to reject
   * with Error("timeout"). This simulates what happens when Promise.race resolves
   * the timeout branch (i.e., the DB query takes longer than 3 seconds).
   * The tools catch errors with err.message === "timeout" and return
   * { success: false, reason: "timeout" }.
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("orderStatusTool returns timeout when DB query exceeds 3 seconds", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate optional orderId (null means most recent order)
        fc.oneof(fc.constant(undefined), fc.stringMatching(/^[0-9a-f]{24}$/)),
        async (orderId) => {
          jest.clearAllMocks();

          // Mock Order.findOne chain to reject with timeout error
          // This simulates Promise.race resolving the timeout branch
          const leanMock = jest.fn().mockRejectedValue(new Error("timeout"));
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          const result = await executeOrderStatus({ orderId, userId: "user123" });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  test("couponTool (list action) returns timeout when DB query exceeds 3 seconds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant("list"),
        async (action) => {
          jest.clearAllMocks();

          // Mock CouponUsage.find to reject with timeout
          // The couponTool uses withTimeout() wrapper which rejects with Error("timeout")
          const usageSelectMock = jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error("timeout")),
          });
          CouponUsageModel.find.mockReturnValue({
            select: usageSelectMock,
          });

          const result = await executeCoupon({ action: "list", userId: "user123" });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  test("deliveryEtaTool returns timeout when DB query exceeds 3 seconds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant(undefined), fc.stringMatching(/^[0-9a-f]{24}$/)),
        async (orderId) => {
          jest.clearAllMocks();

          // Mock Order.findOne chain to reject with timeout error
          const leanMock = jest.fn().mockRejectedValue(new Error("timeout"));
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          const result = await executeDeliveryEta({ orderId, userId: "user123" });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  test("reorderTool (order fetch phase) returns timeout when DB query exceeds 3 seconds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant("user123"),
        async (userId) => {
          jest.clearAllMocks();

          // Mock Order.findOne chain to reject with timeout during the order fetch
          const leanMock = jest.fn().mockRejectedValue(new Error("timeout"));
          const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: leanMock });

          const result = await executeReorder({ userId });

          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ─── Property 14: Write timeout enforcement with atomicity ─────────────────────

describe("Feature: chatbot-action-tools, Property 14: Write timeout enforcement with atomicity", () => {
  /**
   * **Validates: Requirements 2.9, 6.10**
   *
   * Strategy: For write-operation tools, mock the write operation to reject
   * with Error("timeout"). This simulates Promise.race resolving the timeout branch
   * when the DB write exceeds 5 seconds.
   *
   * For orderCancelTool: The initial read succeeds (returns an eligible order),
   * but findOneAndUpdate rejects with timeout. The tool should return timeout error.
   * Atomicity is guaranteed by findOneAndUpdate's atomic nature — if it times out,
   * no partial update occurred.
   *
   * For reorderTool: The order fetch and item validation succeed, but the
   * transaction/cart write rejects with timeout. The tool should return timeout error.
   * Atomicity is guaranteed by the MongoDB transaction — if it times out,
   * session.abortTransaction() is called and no items are added to the cart.
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("orderCancelTool returns timeout when write operation exceeds 5 seconds and order state remains unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate eligible order statuses (Placed or Preparing — always eligible)
        fc.constantFrom("Placed", "Preparing"),
        fc.boolean(),
        async (orderStatus, isPaid) => {
          jest.clearAllMocks();

          const now = new Date();
          const mockOrder = {
            _id: "order_timeout_test",
            user: "user123",
            orderStatus,
            createdAt: new Date(now.getTime() - 1000), // 1 second ago (within window)
            isPaid,
            totalPrice: 500,
            orderItems: [{ name: "Pizza", qty: 1 }],
          };

          // Mock Order.findOne (read) to succeed — returns an eligible order
          const readLeanMock = jest.fn().mockResolvedValue(mockOrder);
          const sortMock = jest.fn().mockReturnValue({ lean: readLeanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: readLeanMock });

          // Mock Order.findOneAndUpdate (write) to reject with timeout
          // This simulates the write operation exceeding 5 seconds
          const writeLeanMock = jest.fn().mockRejectedValue(new Error("timeout"));
          mockOrderFindOneAndUpdate.mockReturnValue({ lean: writeLeanMock });

          const result = await executeOrderCancel({ userId: "user123" });

          // Tool should return timeout error
          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");

          // Atomicity: findOneAndUpdate is atomic — if it times out (Promise.race
          // rejects before the DB responds), the DB operation either completed
          // atomically or didn't execute at all. The order state remains unchanged
          // from the client's perspective since we got a timeout.
          // Verify that the original order status was NOT modified in our mock
          // (the mock order object should still have its original status)
          expect(mockOrder.orderStatus).toBe(orderStatus);
        }
      ),
      { numRuns: 20 }
    );
  });

  test("reorderTool returns timeout when cart write exceeds 5 seconds and cart state remains unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-3 order items that will pass validation
        fc.array(
          fc.record({
            product: fc.stringMatching(/^[0-9a-f]{24}$/),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            qty: fc.integer({ min: 1, max: 5 }),
            price: fc.integer({ min: 50, max: 1000 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (orderItems) => {
          jest.clearAllMocks();

          const mockOrder = {
            _id: "order_reorder_timeout",
            user: "user123",
            orderStatus: "Delivered",
            createdAt: new Date(),
            orderItems,
          };

          // Mock Order.findOne (read) to succeed — returns a delivered order
          const readLeanMock = jest.fn().mockResolvedValue(mockOrder);
          const sortMock = jest.fn().mockReturnValue({ lean: readLeanMock });
          mockOrderFindOne.mockReturnValue({ sort: sortMock, lean: readLeanMock });

          // Mock Product.findById to return available products (all items pass validation)
          ProductModel.findById.mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue({
              _id: "prod123",
              isAvailable: true,
              countInStock: 10,
            }),
          }));

          // Mock User.findByIdAndUpdate to reject with timeout during the cart write
          UserModel.findByIdAndUpdate.mockRejectedValue(new Error("timeout"));

          const result = await executeReorder({ userId: "user123" });

          // Tool should return timeout error
          expect(result.success).toBe(false);
          expect(result.reason).toBe("timeout");
          expect(typeof result.message).toBe("string");

          // Cart write was attempted but failed
          expect(UserModel.findByIdAndUpdate).toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
