import express from "express";
import dotenv from "dotenv";
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

// 🚀 PERFORMANCE FIX (STEP 3): Initialize Background Workers
import "./workers/emailWorker.js";

// Error Middlewares
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Routes Import
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import biometricRoutes from "./routes/biometricRoutes.js";
import loyaltyRoutes from "./routes/loyaltyRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
connectDB(); // 🗄️ Database Connection

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);

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
    const cookies = cookie.parse(socket.request.headers.cookie || "");
    const token = cookies.jwt;

    if (!token) {
      console.warn("🚫 Socket Access Denied: No Token");
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

  socket.on("updateLocation", async ({ orderId, lat, lng }) => {
    try {
      const order = await Order.findById(orderId).select("deliveryPartner").lean();
      if (!order) return;
      if (!order.deliveryPartner || order.deliveryPartner.toString() !== socket.user.userId) {
        console.warn(`🚫 Unauthorized location update attempt for order ${orderId}`);
        return;
      }
      io.to(orderId).emit("driverLocationUpdate", { lat, lng });
      console.log(
        `📍 Logistics: Driver for ${orderId} shifted to [${lat}, ${lng}]`,
      );
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
app.use(cookieParser());

// ==========================================
// 🛡️ WEBHOOK FIX: Skip JSON parsing for Razorpay webhook
// ==========================================
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

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

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const isValidOrigin =
    origin &&
    allowedOrigins.includes(origin);
  const isValidReferer =
    referer &&
    allowedOrigins.some((o) => referer.startsWith(o));

  if (!isValidOrigin && !isValidReferer) {
    console.error("🚫 CSRF Attack Blocked from:", origin || referer);
    return res
      .status(403)
      .json({ message: "CSRF Blocked: Unauthorized Request Origin" });
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
  max: 500,
  message: "Too many requests from this IP, please try again later",
});
app.use("/api", apiLimiter);

// 🛡️ SECURITY FIX (BUG-5): Strict rate limiter for OTP/auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 attempts per window
  message: "Too many attempts. Please try again after 10 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/v1/users/verify-email", authLimiter);
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/register", authLimiter);
app.use("/api/v1/users/password/forgot", authLimiter);

app.get("/ping", (req, res) => {
  res.status(200).send("Pong");
});

// 🏥 Health Check Endpoint (for uptime monitoring & load balancers)
app.get("/health", async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  let redisReady = true;
  try {
    // cacheClient may be a Proxy to redisClient or inMemory fallback
    if (cacheClient.ping) {
      await cacheClient.ping();
    }
  } catch {
    redisReady = false;
  }

  const status = mongoReady && redisReady ? 200 : 503;
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
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/biometric", biometricRoutes);
app.use("/api/v1/loyalty", loyaltyRoutes);
app.use("/api/v1/referral", referralRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payouts", payoutRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// --- 📂 Static Files ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "/uploads"), {
    maxAge: "7d",
    immutable: true,
  }),
);

app.get("/", (req, res) => {
  res.send("🚀 SwadKart Beast Engine is running...");
});

// --- 🚨 Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- 🚀 Server Start ---
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`🔥 Mainframe firing on Sector ${PORT}`);
});
