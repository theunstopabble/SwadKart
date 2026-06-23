// ============================================================
// 👑 ROLE-BASED ACCESS CONTROL (RBAC) — FEAT-6
// ============================================================

// Admin-only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.isAdmin)) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin");
  }
};

// Flexible role authorization — accepts any number of roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403);
      throw new Error(`Access denied. Required role(s): ${roles.join(", ")}`);
    }
  };
};

// Admin OR Restaurant Owner
export const adminOrRestaurantOwner = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "restaurant_owner")
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin or restaurant owner");
  }
};

// Admin OR Delivery Partner (for delivery-related endpoints)
export const adminOrDeliveryPartner = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "delivery_partner")
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin or delivery partner");
  }
};

// Owner of resource OR Admin (generic resource ownership check)
// Usage: checkResourceOwnership(getResourceFn, ownerFieldPath)
export const resourceOwnerOrAdmin =
  (getResourceFn, ownerField = "user") => async (req, res, next) => {
    try {
      if (req.user && req.user.role === "admin") return next();

      const resource = await getResourceFn(req);
      if (!resource) {
        res.status(404);
        throw new Error("Resource not found");
      }

      const ownerId =
        ownerField.includes(".")
          ? ownerField.split(".").reduce((obj, key) => obj?.[key], resource)
          : resource[ownerField];

      if (
        ownerId &&
        ownerId.toString() === req.user._id.toString()
      ) {
        next();
      } else {
        res.status(403);
        throw new Error("Not authorized to access this resource");
      }
    } catch (err) {
      next(err);
    }
  };
