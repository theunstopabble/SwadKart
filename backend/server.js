import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/authMiddleware.js";

// Routes Import
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";

dotenv.config();
connectDB(); // 🗄️ Database Connection

const app = express();
const httpServer = createServer(app);

// 🔌 Socket.io Setup with CORS (Frontend Sync के लिए अनिवार्य)
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://swadkart-pro.vercel.app",
      "https://swadkart-pro.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Middleware to make 'io' instance accessible in all controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Real-time Event Handling Logic
io.on("connection", (socket) => {
  console.log(`⚡ Client Connected: ${socket.id}`);

  // User/Admin joins a specific room for order tracking
  socket.on("joinOrder", (id) => {
    socket.join(id);
    console.log(`👤 Socket ${socket.id} locked into room: ${id}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client ${socket.id} left the kitchen.`);
  });
});

// --- General Middleware ---
app.use(compression()); // 📦 Makes API responses faster
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Strict CORS Configuration ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://swadkart-pro.vercel.app",
  "https://swadkart-pro.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS Policy Violation: Origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// --- API Routes Mapping ---
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);

// --- File Handling Protocol ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// --- Deployment Logic (Render/Vercel Sync) ---
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) =>
    res.sendFile(
      path.resolve(__dirname, "..", "frontend", "dist", "index.html")
    )
  );
} else {
  app.get("/ping", (req, res) => res.status(200).send("Server is alive! 🍕"));
  app.get("/", (req, res) =>
    res.send("🚀 SwadKart API is running in Dev Mode...")
  );
}

// Global Error Handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`🔥 SwadKart Beast Server firing on port ${PORT}`);
});
