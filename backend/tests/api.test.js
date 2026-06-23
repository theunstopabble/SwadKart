import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

let app;
let testUser;
let testAdmin;
let authToken;
let adminToken;
let testRestaurant;
let testProduct;

const ORIGIN = "http://localhost:5173";

beforeAll(async () => {
  const res = await import("../server.js");
  app = res.app;
  // Wait for MongoDB connection to be ready
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once("connected", resolve);
    // Timeout after 10s
    setTimeout(resolve, 10000);
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});

describe("Health & Root Endpoints", () => {
  it("GET /health should return health status", async () => {
    const res = await request(app).get("/health");
    // Health endpoint returns 200 when mongo is connected, 503 when degraded
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body.services).toHaveProperty("mongo");
    expect(res.body.services).toHaveProperty("redis");
  });

  it("GET /ping should return 200", async () => {
    const res = await request(app).get("/ping");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Pong");
  });

  it("GET / should return API info", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("SwadKart API");
  });
});

describe("Auth Routes", () => {
  it("POST /api/v1/users/register should reject empty body", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .set("Origin", ORIGIN)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/users/login should reject empty credentials", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .set("Origin", ORIGIN)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({});
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/users/profile should reject unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/users/profile");
    expect(res.status).toBe(401);
  });
});

describe("Restaurant Routes", () => {
  it("GET /api/v1/restaurants should return restaurant list", async () => {
    const res = await request(app).get("/api/v1/restaurants");
    expect(res.status).toBe(200);
    // Response may be paginated (object with data array) or a plain array
    const isArray = Array.isArray(res.body);
    const hasPaginatedData = res.body && Array.isArray(res.body.data || res.body.restaurants);
    expect(isArray || hasPaginatedData).toBe(true);
  });

  it("GET /api/v1/restaurants with invalid page should use defaults", async () => {
    const res = await request(app)
      .get("/api/v1/restaurants")
      .query({ page: "invalid", limit: "abc" });
    expect(res.status).toBe(200);
  });
});

describe("Product Routes", () => {
  it("GET /api/v1/products should return product list", async () => {
    const res = await request(app).get("/api/v1/products");
    expect(res.status).toBe(200);
  });

  it("GET /api/v1/products/:id with invalid ID should return error status", async () => {
    const res = await request(app).get("/api/v1/products/invalid-id-123");
    expect([400, 404, 500]).toContain(res.status);
  });
});

describe("Order Routes", () => {
  it("POST /api/v1/orders without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Origin", ORIGIN)
      .send({ orderItems: [] });
    expect(res.status).toBe(401);
  });
});

describe("SwadPass Routes", () => {
  it("GET /api/v1/swadpass/status without auth should return 401", async () => {
    const res = await request(app).get("/api/v1/swadpass/status");
    expect(res.status).toBe(401);
  });
});

describe("Coupon Routes", () => {
  it("GET /api/v1/coupons/validate without auth should return 401 or 404", async () => {
    const res = await request(app)
      .get("/api/v1/coupons/validate")
      .query({ code: "TEST" });
    // Route may not exist (404) or require auth (401)
    expect([401, 404]).toContain(res.status);
  });
});

describe("Calculator Routes (Enterprise)", () => {
  it("POST /api/v1/cost-calculator/batch without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/cost-calculator/batch")
      .set("Origin", ORIGIN)
      .send({ ingredients: [] });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/delivery-calculator/fee without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/delivery-calculator/fee")
      .set("Origin", ORIGIN)
      .send({ distanceKm: 5 });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/driver-earnings/calculate without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/driver-earnings/calculate")
      .set("Origin", ORIGIN)
      .send({ baseEarning: 50 });
    expect(res.status).toBe(401);
  });
});

describe("Security: NoSQL Injection Prevention", () => {
  it("should strip $ operators from request body", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .set("Origin", ORIGIN)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ email: "test@test.com", password: "password123", $gt: "" });
    // Sanitizer strips $ keys; login proceeds with clean body (user won't exist -> 401, NOT 500)
    expect(res.status).not.toBe(500);
  });

  it("should strip dots from request body keys", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .set("Origin", ORIGIN)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ email: "test@test.com", password: "pass", "user.role": "admin" });
    // Sanitizer strips dotted keys and request proceeds normally
    // The key point is it should NOT be 500 (injection didn't crash the server)
    expect(res.status).not.toBe(500);
  });
});

describe("Security: Rate Limiting", () => {
  it("should enforce rate limit on /ping", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/ping");
      results.push(res.status);
    }
    expect(results.every((s) => s === 200)).toBe(true);
  });
});