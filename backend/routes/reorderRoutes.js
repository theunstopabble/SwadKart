import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getFrequentItems,
  getRecentOrdersForReorder,
} from "../controllers/reorderController.js";

const router = express.Router();

router.get("/frequent", protect, getFrequentItems);
router.get("/recent", protect, getRecentOrdersForReorder);

export default router;
