import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGroupOrder,
  joinGroupOrder,
  getGroupOrder,
  addToGroupCart,
  calculateSplit,
} from "../controllers/groupOrderController.js";

const router = express.Router();

router.post("/", protect, createGroupOrder);
router.post("/join", protect, joinGroupOrder);
router.get("/:id", protect, getGroupOrder);
router.put("/:id/cart", protect, addToGroupCart);
router.get("/:id/split", protect, calculateSplit);

export default router;
