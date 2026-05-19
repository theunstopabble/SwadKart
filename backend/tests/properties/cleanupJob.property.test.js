/**
 * Property 18: Cleanup sweep removes only conversations idle longer than 90 days.
 *
 * **Validates: Requirements 7.7**
 *
 * Feature: chatbot-enterprise-upgrade
 *
 * For any current timestamp `now` and any backing set of Conversation documents,
 * after the cleanup job completes:
 * - The deleteMany query targets only documents with updatedAt > 90 days ago
 * - The 24h guard prevents re-execution within 24 hours
 */
import { jest } from "@jest/globals";
import fc from "fast-check";

// Mock the Conversation model before importing the service
const mockDeleteMany = jest.fn();
jest.unstable_mockModule("../../models/conversationModel.js", () => ({
  default: {
    deleteMany: mockDeleteMany,
  },
}));

const { runCleanup, _resetForTesting, _setLastRunAt } = await import(
  "../../services/chat/cleanupJob.js"
);

beforeEach(() => {
  _resetForTesting();
  mockDeleteMany.mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  _resetForTesting();
  console.log.mockRestore();
  console.error.mockRestore();
});

describe("Property 18: Cleanup sweep removes only conversations idle longer than 90 days", () => {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  test("runCleanup uses a cutoff date of exactly 90 days before now in the deleteMany query", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }), // arbitrary deletedCount
        async (deletedCount) => {
          _resetForTesting();
          mockDeleteMany.mockReset();
          mockDeleteMany.mockResolvedValue({ deletedCount });

          const beforeRun = Date.now();
          const result = await runCleanup();
          const afterRun = Date.now();

          expect(result.skipped).toBe(false);
          expect(result.deletedCount).toBe(deletedCount);

          // Verify deleteMany was called with the correct filter
          expect(mockDeleteMany).toHaveBeenCalledTimes(1);
          const filter = mockDeleteMany.mock.calls[0][0];

          expect(filter).toHaveProperty("updatedAt");
          expect(filter.updatedAt).toHaveProperty("$lt");

          const cutoff = filter.updatedAt.$lt;
          expect(cutoff).toBeInstanceOf(Date);

          // The cutoff should be approximately 90 days before now
          const expectedCutoffMin = beforeRun - NINETY_DAYS_MS;
          const expectedCutoffMax = afterRun - NINETY_DAYS_MS;

          expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedCutoffMin - 100);
          expect(cutoff.getTime()).toBeLessThanOrEqual(expectedCutoffMax + 100);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("24h guard prevents re-execution within 24 hours", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Time since last run: 1s to 23.9 hours (within 24h)
        fc.integer({ min: 1000, max: TWENTY_FOUR_HOURS_MS - 1000 }),
        async (msSinceLastRun) => {
          _resetForTesting();
          mockDeleteMany.mockReset();
          mockDeleteMany.mockResolvedValue({ deletedCount: 0 });

          // Set lastRunAt to some time within the last 24h
          _setLastRunAt(Date.now() - msSinceLastRun);

          const result = await runCleanup();
          expect(result.skipped).toBe(true);
          expect(mockDeleteMany).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("allows execution when more than 24 hours have passed since last run", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Time since last run: 24h + 1s to 72h
        fc.integer({ min: TWENTY_FOUR_HOURS_MS + 1000, max: 3 * TWENTY_FOUR_HOURS_MS }),
        async (msSinceLastRun) => {
          _resetForTesting();
          mockDeleteMany.mockReset();
          mockDeleteMany.mockResolvedValue({ deletedCount: 0 });

          // Set lastRunAt to more than 24h ago
          _setLastRunAt(Date.now() - msSinceLastRun);

          const result = await runCleanup();
          expect(result.skipped).toBe(false);
          expect(mockDeleteMany).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("allows execution when lastRunAt is null (first run)", async () => {
    _resetForTesting();
    mockDeleteMany.mockReset();
    mockDeleteMany.mockResolvedValue({ deletedCount: 7 });

    const result = await runCleanup();
    expect(result.skipped).toBe(false);
    expect(result.deletedCount).toBe(7);
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
  });

  test("handles DB errors gracefully without throwing", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (errorMsg) => {
          _resetForTesting();
          mockDeleteMany.mockReset();
          mockDeleteMany.mockRejectedValue(new Error(errorMsg));

          const result = await runCleanup();
          // Should not throw, should return gracefully
          expect(result.skipped).toBe(false);
          expect(result.deletedCount).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });
});
