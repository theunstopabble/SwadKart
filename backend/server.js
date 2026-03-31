import express from "express";
import dotenv from "dotenv";
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

dotenv.config();
connectDB(); // 🗄️ Database Connection

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);

// --- 🌐 Configuration ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "https://swadkart.vercel.app",
  process.env.FRONTEND_URL,
  "https://swadkart-5wtf.onrender.com",
];

// --- 🔌 Socket.io Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
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
io.on("connection", (socket) => {
  console.log(
    `⚡ Secure Signal Established: ${socket.id} (User: ${socket.user.userId})`,
  );

  socket.on("joinOrder", (id) => {
    socket.join(id);
    console.log(`👤 Security: Socket locked into Sector ${id}`);
  });

  socket.on("updateLocation", ({ orderId, lat, lng }) => {
    io.to(orderId).emit("driverLocationUpdate", { lat, lng });
    console.log(
      `📍 Logistics: Driver for ${orderId} shifted to [${lat}, ${lng}]`,
    );
  });

  socket.on("disconnect", () => {
    console.log(`❌ Signal Lost: ${socket.id} left the grid.`);
  });
});

// --- 🛡️ Standard Middleware ---
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================================
// 🛡️ SECURITY FIX: Safe Custom NoSQL Sanitizer
// ==========================================
const safeMongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
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

// --- 🛡️ 1. Dynamic CORS Fix ---
app.use(
  cors({
    origin: (origin, callback) => {
      const isVercel = origin && origin.endsWith(".vercel.app");
      const isAllowed = !origin || allowedOrigins.includes(origin);

      if (isAllowed || isVercel) {
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

app.get("/ping", (req, res) => {
  res.status(200).send("Pong");
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
