import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// Mock the Conversation model before importing the module under test
const mockDeleteMany = jest.fn();
jest.unstable_mockModule("../models/conversationModel.js", () => ({
  default: {
    deleteMany: mockDeleteMany,
  },
}));

// Dynamic import after mock setup (required for ESM)
const { runCleanup, scheduleCleanup, _resetForTesting, _getLastRunAt, _setLastRunAt } =
  await import("../services/chat/cleanupJob.js");

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

describe("cleanupJob - runCleanup", () => {
  it("should delete conversations older than 90 days", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });

    const result = await runCleanup();

    expect(result.skipped).toBe(false);
    expect(result.deletedCount).toBe(5);
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);

    // Verify the query uses updatedAt with a date ~90 days ago
    const call = mockDeleteMany.mock.calls[0][0];
    expect(call).toHaveProperty("updatedAt");
    expect(call.updatedAt).toHaveProperty("$lt");
    const cutoff = call.updatedAt.$lt;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    // Allow 5 seconds tolerance
    expect(Math.abs(cutoff.getTime() - ninetyDaysAgo)).toBeLessThan(5000);
  });

  it("should skip if called within 24 hours of last run", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 3 });

    // First run should execute
    const first = await runCleanup();
    expect(first.skipped).toBe(false);
    expect(first.deletedCount).toBe(3);

    // Second run within 24h should skip
    const second = await runCleanup();
    expect(second.skipped).toBe(true);
    expect(mockDeleteMany).toHaveBeenCalledTimes(1); // only called once
  });

  it("should allow run after 24 hours have passed", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 2 });

    // Simulate a run that happened 25 hours ago
    _setLastRunAt(Date.now() - 25 * 60 * 60 * 1000);

    const result = await runCleanup();
    expect(result.skipped).toBe(false);
    expect(result.deletedCount).toBe(2);
  });

  it("should handle errors gracefully without throwing", async () => {
    mockDeleteMany.mockRejectedValue(new Error("DB connection failed"));

    const result = await runCleanup();

    expect(result.skipped).toBe(false);
    expect(result.deletedCount).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "[CleanupJob] Error during cleanup:",
      "DB connection failed"
    );
  });

  it("should log the number of deleted documents", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 12 });

    await runCleanup();

    expect(console.log).toHaveBeenCalledWith(
      "[CleanupJob] Deleted 12 conversation(s) older than 90 days."
    );
  });

  it("should handle zero deletions", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 0 });

    const result = await runCleanup();

    expect(result.skipped).toBe(false);
    expect(result.deletedCount).toBe(0);
  });

  it("should update lastRunAt timestamp after successful run", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 1 });

    expect(_getLastRunAt()).toBeNull();

    const before = Date.now();
    await runCleanup();
    const after = Date.now();

    const lastRun = _getLastRunAt();
    expect(lastRun).toBeGreaterThanOrEqual(before);
    expect(lastRun).toBeLessThanOrEqual(after);
  });
});

describe("cleanupJob - scheduleCleanup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDeleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  afterEach(() => {
    _resetForTesting();
    jest.useRealTimers();
  });

  it("should run cleanup immediately on schedule", () => {
    scheduleCleanup();

    // runCleanup is called immediately (async, but initiated)
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
  });

  it("should not create multiple intervals if called multiple times", () => {
    scheduleCleanup();
    scheduleCleanup();
    scheduleCleanup();

    // Only one immediate call
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
  });
});
