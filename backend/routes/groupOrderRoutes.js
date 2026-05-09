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
router.get("/my", protect, async (req, res, next) => {
  try {
    const groupOrderModel = (await import("../models/groupOrderModel.js")).default;
    const orders = await groupOrderModel.find({
      $or: [{ host: req.user._id }, { "members.user": req.user._id }],
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});
router.get("/:id", protect, getGroupOrder);
router.put("/:id/cart", protect, addToGroupCart);
router.get("/:id/split", protect, calculateSplit);

export default router;
