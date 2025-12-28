import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// 🔐 PROTECT MIDDLEWARE: JWT Token Verification
export const protect = async (req, res, next) => {
  let token;

  // Header se token nikalne ka logic
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // decoded.id (kyunki generateToken me 'id' pass kiya hai)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        res.status(401);
        return next(new Error("User not found")); // 👈 JSON ki jagah next(error)
      }

      return next(); // Sab theek hai to aage badho
    } catch (error) {
      console.error("🔥 JWT Auth Error:", error.message);
      res.status(401);
      return next(new Error("Not authorized, token failed")); // 👈 Error handler ko pass karein
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error("Not authorized, no token"));
  }
};

// 👑 ROLE AUTHORIZATION (Admin, Partner, etc.)
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      // standardize error message for frontend
      return next(
        new Error(`Role (${req.user?.role || "Guest"}) is not authorized`)
      );
    }
    next();
  };
};

// ⚠️ 404 NOT FOUND HANDLER
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 🛑 GLOBAL ERROR HANDLER (Standard 4-Parameter Middleware)
// Iska sequence (err, req, res, next) hona MUST hai taaki Express ise pehchane
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
