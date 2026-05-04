import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getLowStockProducts,
  bulkRestock,
  toggleAutoDisable,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/low-stock", authenticateToken, getLowStockProducts);
router.post("/bulk-restock", authenticateToken, bulkRestock);
router.patch("/:id/auto-disable", authenticateToken, toggleAutoDisable);

export default router;
