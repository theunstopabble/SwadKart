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

// ---------------------------------------------------------
// 🔌 Socket.io Setup (For Realtime Updates)
// ---------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://swadkart-pro.vercel.app",
      "https://swadkart-pro.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// 👇 CRITICAL MIDDLEWARE: Attach 'io' to every request
// Isse hi Controller mein 'req.io.emit' kaam karega
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🛰️ Real-time Communication Protocols
io.on("connection", (socket) => {
  console.log(`⚡ Signal Established: ${socket.id}`);

  // 1. Join Order/User Room
  socket.on("joinOrder", (id) => {
    socket.join(id);
    console.log(`👤 Security: Socket locked into Sector ${id}`);
  });

  // 2. 🗺️ Live Map Tracking Logic (For Driver)
  socket.on("updateLocation", ({ orderId, lat, lng }) => {
    io.to(orderId).emit("driverLocationUpdate", { lat, lng });
    console.log(
      `📍 Logistics: Driver for ${orderId} shifted to [${lat}, ${lng}]`
    );
  });

  socket.on("disconnect", () => {
    console.log(`❌ Signal Lost: ${socket.id} left the grid.`);
  });
});

// ---------------------------------------------------------
// 🛡️ Standard Middleware
// ---------------------------------------------------------
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Security: Strict CORS Configuration ---
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
        callback(new Error("CORS Protocol Violation: Access Denied"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.get("/ping", (req, res) => {
  res.status(200).send("Pong");
});
// ---------------------------------------------------------
// 🛣️ API Routes
// ---------------------------------------------------------
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);

// ---------------------------------------------------------
// 📂 Static Files & Deployment Logic
// ---------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));


  app.get("/", (req, res) =>
    res.send("🚀 SwadKart Beast Engine is running...")
  );
}

// ---------------------------------------------------------
// 🚨 Error Handling
// ---------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`🔥 Mainframe firing on Sector ${PORT}`);
});
