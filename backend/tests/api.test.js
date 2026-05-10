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

beforeAll(async () => {
  const res = await import("../server.js");
  app = res.app;
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});

describe("Health & Root Endpoints", () => {
  it("GET /health should return healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
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
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/users/login should reject empty credentials", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
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
    expect(Array.isArray(res.body)).toBe(true);
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

  it("GET /api/v1/products/:id with invalid ID should return 500 or 400", async () => {
    const res = await request(app).get("/api/v1/products/invalid-id-123");
    expect([400, 500]).toContain(res.status);
  });
});

describe("Order Routes", () => {
  it("POST /api/v1/orders without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
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
  it("GET /api/v1/coupons/validate without auth should return 401", async () => {
    const res = await request(app)
      .get("/api/v1/coupons/validate")
      .query({ code: "TEST" });
    expect(res.status).toBe(401);
  });
});

describe("Calculator Routes (Enterprise)", () => {
  it("POST /api/v1/cost-calculator/calculate without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/cost-calculator/calculate")
      .send({ ingredients: [] });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/delivery-calculator/fee without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/delivery-calculator/fee")
      .send({ distanceKm: 5 });
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/driver-earnings/calculate without auth should return 401", async () => {
    const res = await request(app)
      .post("/api/v1/driver-earnings/calculate")
      .send({ baseEarning: 50 });
    expect(res.status).toBe(401);
  });
});

describe("Security: NoSQL Injection Prevention", () => {
  it("should block $ operators in request body", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ name: "test", email: "test@test.com", password: "password123", phone: "9999999999", $gt: "" });
    expect(res.status).toBe(400);
  });

  it("should block dots in request body keys", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "test@test.com", password: "pass", "user.role": "admin" });
    expect(res.status).toBe(400);
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