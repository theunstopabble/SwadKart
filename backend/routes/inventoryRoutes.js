import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getLowStockProducts,
  bulkRestock,
  toggleAutoDisable,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/low-stock", protect, getLowStockProducts);
router.post("/bulk-restock", protect, bulkRestock);
router.patch("/:id/auto-disable", protect, toggleAutoDisable);

export default router;
