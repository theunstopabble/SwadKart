import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getLowStockProducts,
  bulkRestock,
  toggleAutoDisable,
} from "../controllers/inventoryController.js";

const router = express.Router();

// 🛡️ FIX: Restrict inventory endpoints to admin and restaurant owners
router.get("/low-stock", protect, authorizeRoles("admin", "restaurant_owner"), getLowStockProducts);
router.post("/bulk-restock", protect, authorizeRoles("admin", "restaurant_owner"), bulkRestock);
router.patch("/:id/auto-disable", protect, authorizeRoles("admin", "restaurant_owner"), toggleAutoDisable);

export default router;
