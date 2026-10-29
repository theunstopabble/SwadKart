import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";

// ============================================================
// 🔐 PROTECT MIDDLEWARE (Header + Cookie Support)
// ============================================================
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1️⃣ Check Authorization Header (Bearer Token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded.userId || decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(401);
        throw new Error("User not found with this token");
      }

      if (
        decoded.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        res.status(401);
        throw new Error("Token expired after password change");
      }

      // Omit password from req.user
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;

      return next();
    } catch (error) {
      console.error("🔥 Header Auth Error:", error.message);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  // 2️⃣ Check Cookies (Fallback Mechanism)
  if (!token && req.cookies && req.cookies.jwt) {
    try {
      token = req.cookies.jwt;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded.userId || decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(401);
        throw new Error("User not found with this cookie");
      }

      if (
        decoded.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        res.status(401);
        throw new Error("Token expired after password change");
      }

      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;

      return next();
    } catch (error) {
      console.error("🔥 Cookie Auth Error:", error.message);
      res.status(401);
      throw new Error("Not authorized, cookie failed");
    }
  }

  // 3️⃣ No token provided
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// ============================================================
// 🎭 ROLE AUTHORIZATION (Flexible)
// Example: authorizeRoles('admin', 'restaurant_owner')
// ============================================================
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Not authorized to access this route");
    }
    next();
  };
};

// ============================================================
// 🔓 OPTIONAL AUTH MIDDLEWARE
// ============================================================
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }
    } catch {
      // Just ignore auth errors, req.user remains undefined
    }
  }
  next();
});
