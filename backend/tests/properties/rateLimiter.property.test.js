/**
 * Property 23: Dual-tier rate limiter admits at most 10 IP requests per 60s
 * and 50 user requests per 3600s.
 *
 * Property 24: 429 response payload always carries a valid retryAfterSeconds
 * (positive integer ≤ the window size).
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.5**
 *
 * Strategy:
 * - Mock Redis as unavailable so the rate limiter always uses the deterministic
 *   in-memory fallback store.
 * - Use `_internals` to reset state between runs.
 * - Generate arbitrary sequences of timed requests and verify the admission
 *   invariants hold.
 */
import { jest } from "@jest/globals";

// Mock the redis config module so that the rate limiter falls back to in-memory.
// The mock provides an object where `incr` is not a function, causing isRedisHealthy() to return false.
jest.unstable_mockModule("../../config/redis.js", () => ({
  default: {
    ping: () => Promise.reject(new Error("Redis unavailable")),
  },
}));

const { checkRateLimits, _internals } = await import(
  "../../services/chat/rateLimiter.js"
);
const fc = (await import("fast-check")).default;

// --- Generator: arbTimedRequests ---
// Array of { ip: string, userId: string|null, timestamp: number }
const arbIp = fc
  .integer({ min: 1, max: 5 })
  .map((n) => `192.168.1.${n}`);

const arbUserId = fc.oneof(
  fc.constant(null),
  fc.integer({ min: 1, max: 3 }).map((n) => `user_${n}`)
);

const arbTimedRequest = fc.record({
  ip: arbIp,
  userId: arbUserId,
  timestamp: fc.integer({ min: 0, max: 120000 }),
});

const arbTimedRequests = fc.array(arbTimedRequest, {
  minLength: 1,
  maxLength: 60,
});

describe("Property 23: Dual-tier rate limiter admits at most 10 IP requests per 60s and 50 user requests per 3600s", () => {
  beforeEach(() => {
    // Reset in-memory store between each test
    _internals.inMemoryStore.clear();
  });

  test("for any sequence of requests from the same IP within 60s, at most 10 are admitted", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 30 }),
        async (numRequests) => {
          _internals.inMemoryStore.clear();

          const ip = "10.0.0.1";
          let admitted = 0;

          for (let i = 0; i < numRequests; i++) {
            const result = await checkRateLimits({ ip, userId: null });
            if (result.ok) admitted++;
          }

          expect(admitted).toBeLessThanOrEqual(_internals.IP_LIMIT);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("for any sequence of requests from the same userId within 3600s, at most 50 are admitted", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 80 }),
        async (numRequests) => {
          _internals.inMemoryStore.clear();

          // Use different IPs to avoid hitting IP limit first
          const userId = "test_user_1";
          let admitted = 0;

          for (let i = 0; i < numRequests; i++) {
            // Each request gets a unique IP so IP limit never triggers
            const ip = `10.${Math.floor(i / 250)}.${Math.floor((i % 250) / 250)}.${(i % 250) + 1}`;
            const result = await checkRateLimits({ ip, userId });
            if (result.ok) admitted++;
          }

          expect(admitted).toBeLessThanOrEqual(_internals.USER_LIMIT);
        }
      ),
      { numRuns: 30 }
    );
  });

  test("IP limit is exactly 10: the 11th request from the same IP is rejected", async () => {
    _internals.inMemoryStore.clear();

    const ip = "10.0.0.99";
    const results = [];

    for (let i = 0; i < 12; i++) {
      results.push(await checkRateLimits({ ip, userId: null }));
    }

    // First 10 should be admitted
    const admittedCount = results.filter((r) => r.ok).length;
    expect(admittedCount).toBe(_internals.IP_LIMIT);

    // 11th and 12th should be rejected
    expect(results[10].ok).toBe(false);
    expect(results[11].ok).toBe(false);
  });

  test("user limit is exactly 50: the 51st request from the same userId is rejected", async () => {
    _internals.inMemoryStore.clear();

    const userId = "heavy_user";
    const results = [];

    for (let i = 0; i < 52; i++) {
      // Each request gets a unique IP so IP limit never triggers
      const ip = `172.16.${Math.floor(i / 250)}.${(i % 250) + 1}`;
      results.push(await checkRateLimits({ ip, userId }));
    }

    const admittedCount = results.filter((r) => r.ok).length;
    expect(admittedCount).toBe(_internals.USER_LIMIT);

    // 51st should be rejected
    expect(results[50].ok).toBe(false);
  });
});

describe("Property 24: 429 response payload always carries a valid retryAfterSeconds", () => {
  beforeEach(() => {
    _internals.inMemoryStore.clear();
  });

  test("when IP rate limit is exceeded, response has { ok: false, retryAfterSeconds } where retryAfterSeconds is a positive integer ≤ IP window size", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 25 }),
        async (numRequests) => {
          _internals.inMemoryStore.clear();

          const ip = "10.99.99.1";
          const rejections = [];

          for (let i = 0; i < numRequests; i++) {
            const result = await checkRateLimits({ ip, userId: null });
            if (!result.ok) {
              rejections.push(result);
            }
          }

          // There must be at least one rejection since numRequests > IP_LIMIT
          expect(rejections.length).toBeGreaterThan(0);

          for (const rejection of rejections) {
            expect(rejection.ok).toBe(false);
            expect(rejection).toHaveProperty("retryAfterSeconds");
            expect(typeof rejection.retryAfterSeconds).toBe("number");
            expect(Number.isInteger(rejection.retryAfterSeconds)).toBe(true);
            expect(rejection.retryAfterSeconds).toBeGreaterThanOrEqual(1);
            expect(rejection.retryAfterSeconds).toBeLessThanOrEqual(
              _internals.IP_WINDOW_SECONDS
            );
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test("when user rate limit is exceeded, retryAfterSeconds ≤ USER_WINDOW_SECONDS", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 51, max: 60 }),
        async (numRequests) => {
          _internals.inMemoryStore.clear();

          const userId = "rate_limited_user";
          const rejections = [];

          for (let i = 0; i < numRequests; i++) {
            // Each request gets a unique IP
            const ip = `10.${Math.floor(i / 250)}.${Math.floor((i % 250) / 250)}.${(i % 250) + 1}`;
            const result = await checkRateLimits({ ip, userId });
            if (!result.ok) {
              rejections.push(result);
            }
          }

          // There must be rejections since numRequests > USER_LIMIT
          expect(rejections.length).toBeGreaterThan(0);

          for (const rejection of rejections) {
            expect(rejection.ok).toBe(false);
            expect(rejection).toHaveProperty("retryAfterSeconds");
            expect(typeof rejection.retryAfterSeconds).toBe("number");
            expect(Number.isInteger(rejection.retryAfterSeconds)).toBe(true);
            expect(rejection.retryAfterSeconds).toBeGreaterThanOrEqual(1);
            expect(rejection.retryAfterSeconds).toBeLessThanOrEqual(
              _internals.USER_WINDOW_SECONDS
            );
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("retryAfterSeconds is always a positive integer for any rejection scenario", async () => {
    await fc.assert(
      fc.asyncProperty(arbTimedRequests, async (requests) => {
        _internals.inMemoryStore.clear();

        for (const req of requests) {
          const result = await checkRateLimits({
            ip: req.ip,
            userId: req.userId,
          });

          if (!result.ok) {
            // Validate the rejection payload
            expect(result).toHaveProperty("retryAfterSeconds");
            expect(typeof result.retryAfterSeconds).toBe("number");
            expect(Number.isInteger(result.retryAfterSeconds)).toBe(true);
            expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
            // Must be ≤ the maximum window size
            expect(result.retryAfterSeconds).toBeLessThanOrEqual(
              _internals.USER_WINDOW_SECONDS
            );
          }
        }
      }),
      { numRuns: 50 }
    );
  });
});
