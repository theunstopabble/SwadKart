/**
 * Property 21: Analytics aggregations match their definitional formulas.
 * Property 22: Date-range validator accepts exactly the valid ranges (start ≤ end ≤ now).
 *
 * **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**
 *
 * Strategy: Test the date validation logic and verify that the analytics controller
 * rejects invalid date ranges and accepts valid ones. Test aggregation formulas
 * against their definitions.
 */

import { jest } from "@jest/globals";
import fc from "fast-check";

// ─── Mock setup ────────────────────────────────────────────────────────────────

// Mock Conversation model
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();
const mockFind = jest.fn();

jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    countDocuments: mockCountDocuments,
    aggregate: mockAggregate,
    find: mockFind,
  },
}));

// Mock Order model
const mockOrderExists = jest.fn();
jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: {
    exists: mockOrderExists,
  },
}));

const { getChatbotAnalytics } = await import(
  "../../controllers/chatAnalyticsController.js"
);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
  mockCountDocuments.mockReset();
  mockAggregate.mockReset();
  mockFind.mockReset();
  mockOrderExists.mockReset();
}

/**
 * Create a mock Express request with query params.
 */
function createMockReq(query = {}) {
  return { query };
}

/**
 * Create a mock Express response that captures status and json calls.
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

// ─── Arbitrary generators ──────────────────────────────────────────────────────

/** Generate a valid date in the past (within last 2 years) */
const arbPastDate = fc
  .integer({ min: 1, max: 730 })
  .map((daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setMilliseconds(0);
    return d;
  });

/** Generate a valid date range where start ≤ end ≤ now */
const arbValidDateRange = fc
  .tuple(
    fc.integer({ min: 2, max: 730 }),
    fc.integer({ min: 0, max: 730 })
  )
  .filter(([startDaysAgo, endDaysAgo]) => startDaysAgo >= endDaysAgo)
  .map(([startDaysAgo, endDaysAgo]) => {
    const now = new Date();
    const from = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);
    from.setMilliseconds(0);
    to.setMilliseconds(0);
    return { from, to };
  });

/** Generate an invalid date range where start > end */
const arbInvalidDateRange_StartAfterEnd = fc
  .tuple(
    fc.integer({ min: 1, max: 365 }),
    fc.integer({ min: 1, max: 365 })
  )
  .filter(([startDaysAgo, endDaysAgo]) => startDaysAgo < endDaysAgo)
  .map(([startDaysAgo, endDaysAgo]) => {
    const now = new Date();
    const from = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  });

/** Generate a future date (end > now) */
const arbFutureEndDate = fc
  .integer({ min: 1, max: 365 })
  .map((daysInFuture) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysInFuture * 24 * 60 * 60 * 1000);
    return futureDate.toISOString();
  });

/** Generate invalid date strings */
const arbInvalidDateString = fc.constantFrom(
  "not-a-date",
  "2024-13-45",
  "yesterday",
  "abc123",
  "99/99/9999",
  "null",
  "undefined"
);

/** Generate arbitrary non-negative integers for aggregation testing */
const arbNonNegInt = fc.integer({ min: 0, max: 10000 });

/** Generate arbitrary sentiment distribution */
const arbSentimentDist = fc.record({
  negative: fc.integer({ min: 0, max: 1000 }),
  neutral: fc.integer({ min: 0, max: 1000 }),
  positive: fc.integer({ min: 0, max: 1000 }),
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 22: Date-range validator accepts exactly the valid ranges (start ≤ end ≤ now)", () => {
  beforeEach(() => {
    resetMocks();
    // Setup default mocks for successful analytics queries
    mockCountDocuments.mockResolvedValue(0);
    mockAggregate.mockResolvedValue([]);
    mockFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  test("valid date ranges (start ≤ end ≤ now) are accepted and return 200", async () => {
    await fc.assert(
      fc.asyncProperty(arbValidDateRange, async ({ from, to }) => {
        resetMocks();
        mockCountDocuments.mockResolvedValue(5);
        mockAggregate.mockResolvedValue([]);
        mockFind.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

        const req = createMockReq({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        // Should return 200 (not 400)
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeDefined();
        expect(res.body.error).toBeUndefined();

        // Response should contain the expected fields
        expect(res.body).toHaveProperty("dateRange");
        expect(res.body).toHaveProperty("totalConversations");
      }),
      { numRuns: 50 }
    );
  });

  test("invalid date ranges where start > end are rejected with 400", async () => {
    await fc.assert(
      fc.asyncProperty(arbInvalidDateRange_StartAfterEnd, async ({ from, to }) => {
        const req = createMockReq({ from, to });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toBeDefined();
        expect(res.body.error).toBeDefined();
      }),
      { numRuns: 50 }
    );
  });

  test("future end dates (end > now) are rejected with 400", async () => {
    await fc.assert(
      fc.asyncProperty(arbFutureEndDate, async (futureEnd) => {
        const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const req = createMockReq({ from: pastStart, to: futureEnd });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("future");
      }),
      { numRuns: 30 }
    );
  });

  test("invalid date format strings are rejected with 400", async () => {
    await fc.assert(
      fc.asyncProperty(arbInvalidDateString, async (badDate) => {
        // Test with invalid 'from'
        const req = createMockReq({
          from: badDate,
          to: new Date().toISOString(),
        });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
      }),
      { numRuns: 8 } // Limited since arbInvalidDateString is a small set
    );
  });

  test("omitted dates default to last 7 days and are accepted", async () => {
    resetMocks();
    mockCountDocuments.mockResolvedValue(0);
    mockAggregate.mockResolvedValue([]);
    mockFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const req = createMockReq({}); // No from/to
    const res = createMockRes();

    await getChatbotAnalytics(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.dateRange).toBeDefined();

    // Default range should be approximately 7 days
    const from = new Date(res.body.dateRange.from);
    const to = new Date(res.body.dateRange.to);
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);

    // Should be approximately 7 days (within a small tolerance for test execution time)
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });
});

describe("Property 21: Analytics aggregations match their definitional formulas", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("totalConversations equals the count of conversations in the date range", async () => {
    await fc.assert(
      fc.asyncProperty(arbNonNegInt, async (expectedCount) => {
        resetMocks();
        mockCountDocuments.mockResolvedValue(expectedCount);
        mockAggregate.mockResolvedValue([]);
        mockFind.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

        const req = createMockReq({
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.totalConversations).toBe(expectedCount);
      }),
      { numRuns: 50 }
    );
  });

  test("avgResponseTimeMs equals the rounded average from the aggregation pipeline", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0, max: 30000, noNaN: true }).filter(Number.isFinite),
        async (avgMs) => {
          resetMocks();
          mockCountDocuments.mockResolvedValue(10);
          // First aggregate call returns avg response time
          // Second aggregate call returns intent distribution
          // Third aggregate call returns sentiment distribution
          mockAggregate
            .mockResolvedValueOnce([{ _id: null, avgMs }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
          mockFind.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          });

          const req = createMockReq({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });
          const res = createMockRes();

          await getChatbotAnalytics(req, res);

          expect(res.statusCode).toBe(200);
          expect(res.body.avgResponseTimeMs).toBe(Math.round(avgMs));
        }
      ),
      { numRuns: 50 }
    );
  });

  test("avgResponseTimeMs is 0 when no conversations have response time data", async () => {
    resetMocks();
    mockCountDocuments.mockResolvedValue(5);
    // Empty aggregation result means no response time data
    mockAggregate.mockResolvedValue([]);
    mockFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const req = createMockReq({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    });
    const res = createMockRes();

    await getChatbotAnalytics(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.avgResponseTimeMs).toBe(0);
  });

  test("sentimentDistribution buckets sum to total user messages analyzed", async () => {
    await fc.assert(
      fc.asyncProperty(arbSentimentDist, async ({ negative, neutral, positive }) => {
        resetMocks();
        mockCountDocuments.mockResolvedValue(100);
        mockAggregate
          .mockResolvedValueOnce([]) // avg response time
          .mockResolvedValueOnce([]) // intent distribution
          .mockResolvedValueOnce([{ _id: null, negative, neutral, positive }]); // sentiment
        mockFind.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

        const req = createMockReq({
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        });
        const res = createMockRes();

        await getChatbotAnalytics(req, res);

        expect(res.statusCode).toBe(200);

        const dist = res.body.sentimentDistribution;
        expect(dist.negative).toBe(negative);
        expect(dist.neutral).toBe(neutral);
        expect(dist.positive).toBe(positive);

        // Sum should equal total messages analyzed
        const total = dist.negative + dist.neutral + dist.positive;
        expect(total).toBe(negative + neutral + positive);
      }),
      { numRuns: 50 }
    );
  });

  test("intentDistribution includes all 9 intent labels (including zero-count ones)", async () => {
    const INTENT_SET = [
      "order_inquiry", "recommendation", "complaint", "navigation_help",
      "order_placement", "general_chat", "greeting", "farewell", "unknown",
    ];

    await fc.assert(
      fc.asyncProperty(
        // Generate a subset of intents with counts (no duplicates)
        fc.subarray(INTENT_SET, { minLength: 0, maxLength: 5 }).chain((intents) =>
          fc.tuple(
            fc.constant(intents),
            fc.array(fc.integer({ min: 1, max: 500 }), {
              minLength: intents.length,
              maxLength: intents.length,
            })
          )
        ),
        async ([intents, counts]) => {
          const intentAggResult = intents.map((id, i) => ({
            _id: id,
            count: counts[i],
          }));

          resetMocks();
          mockCountDocuments.mockResolvedValue(50);
          mockAggregate
            .mockResolvedValueOnce([]) // avg response time
            .mockResolvedValueOnce(intentAggResult) // intent distribution
            .mockResolvedValueOnce([]); // sentiment
          mockFind.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          });

          const req = createMockReq({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });
          const res = createMockRes();

          await getChatbotAnalytics(req, res);

          expect(res.statusCode).toBe(200);

          const dist = res.body.intentDistribution;

          // Should have exactly 9 entries (one per intent label)
          expect(dist.length).toBe(9);

          // All INTENT_SET labels should be present
          const labels = dist.map((d) => d.label);
          for (const intent of INTENT_SET) {
            expect(labels).toContain(intent);
          }

          // Each entry should have a non-negative count
          for (const entry of dist) {
            expect(entry.count).toBeGreaterThanOrEqual(0);
          }

          // Counts from the aggregation should be reflected
          for (const aggItem of intentAggResult) {
            const found = dist.find((d) => d.label === aggItem._id);
            expect(found).toBeDefined();
            expect(found.count).toBe(aggItem.count);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test("conversionRate is 0 when no authenticated conversations exist", async () => {
    resetMocks();
    mockCountDocuments.mockResolvedValue(10);
    mockAggregate.mockResolvedValue([]);
    mockFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]), // No authenticated conversations
      }),
    });

    const req = createMockReq({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    });
    const res = createMockRes();

    await getChatbotAnalytics(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.conversionRate).toBe(0.0);
  });

  test("conversionRate formula: (conversions / authenticatedConversations) * 100, rounded to 1 decimal", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        async (totalAuth, conversions) => {
          // Ensure conversions ≤ totalAuth
          const actualConversions = Math.min(conversions, totalAuth);

          resetMocks();
          mockCountDocuments.mockResolvedValue(totalAuth);
          mockAggregate.mockResolvedValue([]);

          // Create mock authenticated conversations
          const conversations = Array.from({ length: totalAuth }, (_, i) => ({
            userId: `user_${i}`,
            messages: [
              { role: "user", content: "hi", createdAt: new Date() },
              { role: "assistant", content: "hello", createdAt: new Date() },
            ],
            updatedAt: new Date(),
          }));

          mockFind.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(conversations),
            }),
          });

          // Mock order existence for the first `actualConversions` conversations
          let orderCheckCount = 0;
          mockOrderExists.mockImplementation(() => {
            orderCheckCount++;
            return Promise.resolve(orderCheckCount <= actualConversions ? { _id: "order1" } : null);
          });

          const req = createMockReq({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });
          const res = createMockRes();

          await getChatbotAnalytics(req, res);

          expect(res.statusCode).toBe(200);

          // Conversion rate should match the formula
          const expectedRate = parseFloat(
            ((actualConversions / totalAuth) * 100).toFixed(1)
          );
          expect(res.body.conversionRate).toBe(expectedRate);
        }
      ),
      { numRuns: 30 }
    );
  });
});
