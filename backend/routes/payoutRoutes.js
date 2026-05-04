import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getRestaurantEarnings,
  requestPayout,
  getAllPayouts,
  markPayoutPaid,
} from "../controllers/payoutController.js";

const router = express.Router();

router.get("/restaurant/:id", protect, getRestaurantEarnings);
router.post("/restaurant/:id/request", protect, requestPayout);
router.get("/admin/all", protect, adminOnly, getAllPayouts);
router.patch("/admin/:id/pay", protect, adminOnly, markPayoutPaid);

export default router;
