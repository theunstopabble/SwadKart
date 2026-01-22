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

dotenv.config();
connectDB(); // 🗄️ Database Connection

const app = express();
const httpServer = createServer(app);

// --- 🌐 Configuration ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.swadkart.app",
  "https://swadkart.app",
  process.env.FRONTEND_URL, // Ab ye Northflank se uthayega
  "https://swadkart-5wtf.onrender.com",
];

// --- 🔌 Socket.io Setup (Fixed for Vercel & Northflank) ---
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow if origin is in list or ends with .vercel.app
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

// 🛰️ Socket.io Logic
io.on("connection", (socket) => {
  console.log(`⚡ Signal Established: ${socket.id}`);

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
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- 🛡️ Dynamic CORS Fix (The "Smart Check") ---
app.use(
  cors({
    origin: (origin, callback) => {
      // Debug: Northflank logs mein origin dekhne ke liye
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.includes("swadkart") // 👈 Ye sabse best hai security aur flexibility ke liye
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS Protocol Violation: Socket Access Denied"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

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

// --- 📂 Static Files ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.get("/", (req, res) => {
  res.send("🚀 SwadKart Beast Engine is running...");
});

// --- 🚨 Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- 🚀 Server Start (Fixed Port) ---
// Aapne Northflank par 8000 set kiya hai
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`🔥 Mainframe firing on Sector ${PORT}`); //
});
