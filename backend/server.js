import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import path from "path"; // 👈 Import Path
import { fileURLToPath } from "url"; // 👈 Import for ES Modules
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/authMiddleware.js";

// 👇 Routes Import
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js"; // 👈 Added Upload Route

dotenv.config();
connectDB();

const app = express();

app.use(compression());

// 👇 Allowed Origins List
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://swadkart-pro.vercel.app",
  "https://swadkart-pro.onrender.com",
  "https://swadkart-backend.onrender.com",
];

// 👇 CORS Options (Fixed for 401 & PATCH)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("⚠️ Blocked by CORS:", origin);
      // Dev mode me hum allow kar rahe hain debugging ke liye
      callback(null, true);
    }
  },
  credentials: true, // 👈 Cookies allowed
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // 👈 PATCH is Critical
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// 🔌 Socket.io Setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("⚡ New Client Connected:", socket.id);

  socket.on("joinOrder", (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined order: ${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client Disconnected:", socket.id);
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ping Route
app.get("/ping", (req, res) => res.status(200).send("I am awake!"));

// 🛤️ API ROUTES
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/upload", uploadRoutes); // 👈 Upload API

// 📂 STATIC FOLDER FOR IMAGES (Very Important)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.get("/", (req, res) => {
  res.send("🚀 SwadKart API is running successfully...");
});

// ⚠️ ERROR HANDLING
app.use(notFound);
app.use(errorHandler);

// Port (Default to 8000 as per your previous logs)
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
