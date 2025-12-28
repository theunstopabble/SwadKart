import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// 🔐 PROTECT MIDDLEWARE
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        res.status(401);
        return next(new Error("User not found"));
      }

      return next();
    } catch (error) {
      console.error("🔥 JWT Auth Error:", error.message);
      res.status(401);
      return next(new Error("Not authorized, token failed"));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error("Not authorized, no token"));
  }
};

// 👑 ROLE AUTHORIZATION
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
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

// 🛑 GLOBAL ERROR HANDLER
// ध्यान दें: एक्सप्रेस इसे केवल तभी पहचानता है जब इसमें 4 पैरामीटर (err, req, res, next) हों।
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // कंसोल में एरर लॉग करें ताकि आप रेंडर पर देख सकें
  console.error(`❌ [Error]: ${err.message}`);

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
