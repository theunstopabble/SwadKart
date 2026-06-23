import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

import connectDB from "./config/db.js";
import cacheClient from "./config/redis.js";

// Error Middlewares
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Routes Import
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import chatRoutes, { adminRouter as chatAdminRoutes } from "./routes/chatRoutes.js";
import { scheduleCleanup } from "./services/chat/cleanupJob.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import biometricRoutes from "./routes/biometricRoutes.js";
import loyaltyRoutes from "./routes/loyaltyRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import groupOrderRoutes from "./routes/groupOrderRoutes.js";
import surgeRoutes from "./routes/surgeRoutes.js";
import swadPassRoutes from "./routes/swadPassRoutes.js";
import reorderRoutes from "./routes/reorderRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import costCalculatorRoutes from "./routes/costCalculatorRoutes.js";
import pricingCalculatorRoutes from "./routes/pricingCalculatorRoutes.js";
import deliveryCalculatorRoutes from "./routes/deliveryCalculatorRoutes.js";
import rewardCalculatorRoutes from "./routes/rewardCalculatorRoutes.js";
import analyticsForecastRoutes from "./routes/analyticsForecastRoutes.js";
import inventoryForecastRoutes from "./routes/inventoryForecastRoutes.js";
import driverEarningsRoutes from "./routes/driverEarningsRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import gdprRoutes from "./routes/gdprRoutes.js";

// ============================================================
// 🔒 PRODUCTION ENVIRONMENT VALIDATION
// ============================================================
function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const requiredVars = [
    "JWT_SECRET",
    "MONGO_URI",
    ...(isProduction ? ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "COOKIE_SECRET"] : []),
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error("❌ FATAL: Missing required env vars:", missing.join(", "));
    process.exit(1);
  }

  // JWT secret strength check (production only)
  if (isProduction && process.env.JWT_SECRET.length < 32) {
    console.error("❌ FATAL: JWT_SECRET must be at least 32 characters in production.");
    console.error("   Run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    process.exit(1);
  }

  if (isProduction) {
    const warnVars = ["RAZORPAY_KEY_ID", "CLOUDINARY_CLOUD_NAME", "BREVO_API_KEY", "COOKIE_SECRET"];
    warnVars.forEach((v) => {
      if (!process.env[v]) console.warn("⚠️  Production warning:", v, "is not set");
    });

    if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
      console.warn("⚠️  Production warning: Razorpay TEST key detected. Use LIVE key for production.");
    }

    if (process.env.FRONTEND_URL?.includes("localhost")) {
      console.warn("⚠️  Production warning: FRONTEND_URL points to localhost.");
    }
  }
}
validateEnv();

connectDB(); // 🗄️ Database Connection

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);

// --- 📏 Body Parser Limits (prevent DoS) ---
// 🛡️ Razorpay webhook needs RAW body (must be BEFORE express.json())
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json", limit: "10kb" }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// --- 🌐 Configuration ---
// 🛡️ SECURITY FIX (SEC-7): Only allow specific Vercel domains, not any *.vercel.app
const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "https://swadkart.vercel.app",
  process.env.FRONTEND_URL,
  "https://swadkart-5wtf.onrender.com",
].filter(Boolean); // Remove undefined/null entries

// --- 🔌 Socket.io Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // 🛡️ SECURITY FIX (SEC-7): Removed wildcard .vercel.app check
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS Protocol Violation: Socket Access Denied"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Attach 'io' to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ==========================================
// 🛡️ SECURITY FIX (STEP 3): Socket.io Auth Middleware
// ==========================================
io.use((socket, next) => {
  try {
    // Priority: 1. handshake.auth.token  2. cookie.jwt
    // Cross-origin WebSocket connections don't reliably send cookies
    // (Chrome blocks third-party cookies by default), so we accept
    // the token via handshake.auth as well.
    let token = socket.handshake.auth?.token;

    if (!token) {
      const cookies = cookie.parse(socket.request.headers.cookie || "");
      token = cookies.jwt;
    }

    if (!token) {
      console.warn("🚫 Socket Access Denied: No Token");
      return next(new Error("Authentication error"));
    }

    if (token.length > 1000) {
      console.warn("🚫 Socket Access Denied: Token too long");
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error("🚫 Socket Access Denied: Invalid Token");
    return next(new Error("Authentication error"));
  }
});

// 🛰️ Socket.io Logic
// 🛡️ SECURITY FIX (SEC-5): Verify order ownership before joining room
import Order from "./models/orderModel.js";
import User from "./models/userModel.js";

io.on("connection", (socket) => {
  console.log(
    `⚡ Secure Signal Established: ${socket.id} (User: ${socket.user.userId})`,
  );

  // 🛡️ Auto-join user to their personal room for notifications
  socket.join(socket.user.userId);

  socket.on("joinOrder", async (id) => {
    try {
      // 🛡️ SEC-5: Verify the user is allowed to join this order room
      const order = await Order.findById(id).select("user deliveryPartner orderItems").lean();
      if (!order) return;

      const userId = socket.user.userId;
      const isOrderOwner = order.user.toString() === userId;
      const isDriver = order.deliveryPartner && order.deliveryPartner.toString() === userId;
      // Allow admin and restaurant owner roles to join any room
      const userDoc = await User.findById(userId).select("role").lean();
      const isPrivileged = userDoc && (userDoc.role === "admin" || userDoc.role === "restaurant_owner");

      if (isOrderOwner || isDriver || isPrivileged) {
        socket.join(id);
        console.log(`👤 Security: Socket locked into Sector ${id}`);
      } else {
        console.warn(`🚫 Socket ${socket.id} denied access to order room ${id}`);
      }
    } catch (err) {
      console.error(`⚠️ joinOrder error: ${err.message}`);
    }
  });

  // 📍 FEAT-25: Driver Real-time Tracking
  socket.on("updateLocation", async ({ orderId, lat, lng, heading, speed }) => {
    try {
      const order = await Order.findById(orderId).select("deliveryPartner user").lean();
      if (!order) return;
      if (!order.deliveryPartner || order.deliveryPartner.toString() !== socket.user.userId) {
        console.warn(`🚫 Unauthorized location update attempt for order ${orderId}`);
        return;
      }

      const locationData = {
        lat,
        lng,
        heading: heading || 0,
        speed: speed || 0,
        updatedAt: new Date(),
      };

      // Persist to DB (fire-and-forget, don't block socket)
      Order.updateOne(
        { _id: orderId },
        { $set: { driverLocation: locationData } },
      ).catch((e) => console.error(`[server] Driver location DB update failed for order ${orderId}:`, e.message));

      // Fire-and-forget is intentional — socket handler must not block

      // Broadcast to order room (customer + any admins watching)
      io.to(orderId).emit("driverLocationUpdate", locationData);
      // Also emit to user's personal room in case they're not in order room
      io.to(order.user.toString()).emit("driverLocationUpdate", { orderId, ...locationData });
    } catch (err) {
      console.error("updateLocation error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Signal Lost: ${socket.id} left the grid.`);
  });
});

// --- 🛡️ Standard Middleware ---
app.use(helmet());
app.use(compression());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Body parser limits already configured at top of file (10mb)

// ==========================================
// 🛡️ SECURITY FIX: Safe Custom NoSQL Sanitizer
// ==========================================
const safeMongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (Buffer.isBuffer(obj)) return; // 🛡️ Preserve raw binary bodies (webhooks)
    if (obj instanceof Object) {
      for (const key in obj) {
        if (/^\$/.test(key) || key.includes(".")) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  ["body", "query", "params"].forEach((k) => {
    if (req[k]) sanitize(req[k]);
  });

  next();
};

app.use(safeMongoSanitize);

// ==========================================
// 🛡️ SECURITY FIX (CodeQL): Anti-CSRF Middleware
// ==========================================
const csrfExemptPaths = [
  "/api/v1/payment/webhook",
  "/api/v1/users/contact-support",
  "/api/v1/orders",
  "/api/v1/cost-calculator",
  "/api/v1/delivery-calculator",
  "/api/v1/driver-earnings",
  "/ping",
];

const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Exempt specific public endpoints from CSRF (webhooks, contact form)
  if (csrfExemptPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 🛡️ SECURITY FIX: Allow API clients & mobile apps that send valid Bearer token
  // without Origin/Referer. CSRF primarily targets cookie-based browser auth.
  const hasBearerToken =
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer");

  if (hasBearerToken) {
    return next();
  }

  // Require custom header for cookie-authenticated requests (protection against
  // cross-origin form submission — browsers cannot set X-Requested-With cross-origin)
  if (!req.headers["x-requested-with"]) {
    console.error("🚫 CSRF Blocked: Missing X-Requested-With header");
    return res
      .status(403)
      .json({ message: "CSRF Blocked: Missing required header" });
  }

  next();
};

app.use(csrfProtection);

// --- 🛡️ 1. Dynamic CORS Fix ---
app.use(
  cors({
    origin: (origin, callback) => {
      // 🛡️ SECURITY FIX (SEC-7): Use exact allowedOrigins, no wildcards
      // Allow same-origin & proxied requests without Origin (browsers omit it for same-origin)
      const isAllowed = !origin || allowedOrigins.includes(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("CORS Protocol Violation: Access Denied"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

// --- 🚦 2. Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// 🛡️ SECURITY FIX (BUG-5): Strict rate limiter for OTP/auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please try again after 10 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/v1/users/verify-email", authLimiter);
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/register", authLimiter);
app.use("/api/v1/users/password/forgot", authLimiter);
app.use("/api/v1/users/password/reset", authLimiter);

// 🛡️ Contact support rate limiter (prevent spam)
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many support requests. Please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1/users/contact-support", contactLimiter);

// 🛡️ FEAT-24: Order creation rate limit (prevent spam / fraud)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Order limit reached. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
// Only apply order limit to POST (order creation), not GET/PUT/DELETE
app.use("/api/v1/orders", (req, res, next) => {
  if (req.method === "POST") {
    return orderLimiter(req, res, next);
  }
  next();
});

app.get("/ping", (req, res) => {
  res.status(200).send("Pong");
});

// 🏥 Health Check Endpoint (for uptime monitoring & load balancers)
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many health checks",
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", healthLimiter, async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  let redisReady = true;
  try {
    // cacheClient may be a Proxy to redisClient or inMemory fallback
    if (typeof cacheClient.ping === "function") {
      await cacheClient.ping();
    }
  } catch {
    redisReady = false;
  }

  const status = mongoReady ? 200 : 503;
  res.status(status).json({
    status: status === 200 ? "healthy" : "degraded",
    services: {
      mongo: mongoReady ? "connected" : "disconnected",
      redis: redisReady ? "connected" : "disconnected",
    },
    timestamp: new Date().toISOString(),
  });
});

// --- 🛣️ API Routes ---
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", chatAdminRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/biometric", biometricRoutes);
app.use("/api/v1/loyalty", loyaltyRoutes);
app.use("/api/v1/referral", referralRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payouts", payoutRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/image", imageRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/group-orders", groupOrderRoutes);
app.use("/api/v1/surge", surgeRoutes);
app.use("/api/v1/swadpass", swadPassRoutes);
app.use("/api/v1/reorder", reorderRoutes);
app.use("/api/v1/gamification", gamificationRoutes);
app.use("/api/v1/cost-calculator", costCalculatorRoutes);
app.use("/api/v1/pricing-calculator", pricingCalculatorRoutes);
app.use("/api/v1/delivery-calculator", deliveryCalculatorRoutes);
app.use("/api/v1/rewards-calculator", rewardCalculatorRoutes);
app.use("/api/v1/analytics-forecast", analyticsForecastRoutes);
app.use("/api/v1/inventory-forecast", inventoryForecastRoutes);
app.use("/api/v1/driver-earnings", driverEarningsRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/user/gdpr", gdprRoutes);

// --- 📂 Static Files ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "/uploads"), {
    maxAge: "7d",
    immutable: true,
  }),
);
// Serve public files (robots.txt, favicon, etc.) at root
app.use(
  "/",
  express.static(path.join(__dirname, "/public"), {
    maxAge: "1d",
  }),
);

// --- 🏥 Health Check Endpoint ---
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "SwadKart API",
    version: "1.0.0",
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- 🚨 Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- 🚀 Server Start ---
const PORT = process.env.PORT || 8000;

const server = httpServer.listen(PORT, () => {
  console.log(`🔥 Mainframe firing on Sector ${PORT} [${process.env.NODE_ENV || "development"}]`);

  // 🧹 Schedule 90-day conversation cleanup job (Requirement 7.7)
  scheduleCleanup();
});

// --- 🛡️ Graceful Shutdown ---
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close Socket.io connections first
  io.close(() => {
    console.log("✅ Socket.io server closed");
  });

  server.close(() => {
    console.log("✅ HTTP server closed");
    mongoose.connection.close().then(() => {
      console.log("🔌 MongoDB connection closed.");
      process.exit(0);
    });
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// --- 🚨 Unhandled Promise Rejection ---
process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION:", err.message);
  console.error(err.stack);
  // Always crash + restart to avoid corrupted state
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  // Always crash on uncaught exceptions to avoid corrupted state
  server.close(() => process.exit(1));
});

// Export app for testing
export { app };
