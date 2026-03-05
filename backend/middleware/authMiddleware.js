import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

// ============================================================
// 🔐 PROTECT MIDDLEWARE (Header + Cookie Support)
// ============================================================
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1️⃣ Check Authorization Header (Bearer Token)
  // (Ye method sabse pehle check karega)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // 'Bearer <token>' me se token nikalo
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Token me humne 'id' save kiya tha, par safety ke liye 'userId' bhi check kar rahe hain
      req.user = await User.findById(decoded.userId || decoded.id).select(
        "-password"
      );

      if (!req.user) {
        res.status(401);
        throw new Error("User not found with this token");
      }

      return next(); // Agar user mil gaya, to aage badho
    } catch (error) {
      console.error("🔥 Header Auth Error:", error.message);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  // 2️⃣ Check Cookies (Fallback Mechanism)
  // (Agar header me token nahi mila, to browser cookies check karo)
  if (!token && req.cookies && req.cookies.jwt) {
    try {
      token = req.cookies.jwt;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.userId || decoded.id).select(
        "-password"
      );

      if (!req.user) {
        res.status(401);
        throw new Error("User not found with this cookie");
      }

      return next();
    } catch (error) {
      console.error("🔥 Cookie Auth Error:", error.message);
      res.status(401);
      throw new Error("Not authorized, cookie failed");
    }
  }

  // 3️⃣ Agar kahin bhi token nahi mila
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// ============================================================
// 👑 ADMIN MIDDLEWARE
// ============================================================
export const admin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.role === "admin")) {
    next();
  } else {
    res.status(403); // 403 Forbidden permission issue ke liye behtar hai
    throw new Error("Not authorized as an admin");
  }
};

// ============================================================
// 🎭 ROLE AUTHORIZATION (Flexible)
// Example: authorizeRoles('admin', 'restaurant_owner')
// ============================================================
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `User role '${req.user?.role}' is not authorized to access this route`
      );
    }
    next();
  };
};

