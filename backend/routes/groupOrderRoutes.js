import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import prisma from "../config/prisma.js";
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
    const currentUserId = req.user.id || req.user._id;
    const allRecent = await prisma.groupOrder.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    const orders = allRecent.filter(
      (o) =>
        o.hostId === currentUserId ||
        (Array.isArray(o.members) &&
          o.members.some((m) => m.user?.toString() === currentUserId.toString()))
    );
    res.json(orders);
  } catch (err) {
    next(err);
  }
});
router.get("/:id", protect, getGroupOrder);
router.put("/:id/cart", protect, addToGroupCart);
router.get("/:id/split", protect, calculateSplit);

export default router;
