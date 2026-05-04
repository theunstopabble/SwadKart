import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  getRestaurantEarnings,
  requestPayout,
  getAllPayouts,
  markPayoutPaid,
} from "../controllers/payoutController.js";

const router = express.Router();

router.get("/restaurant/:id", authenticateToken, getRestaurantEarnings);
router.post("/restaurant/:id/request", authenticateToken, requestPayout);
router.get("/admin/all", authenticateToken, adminOnly, getAllPayouts);
router.patch("/admin/:id/pay", authenticateToken, adminOnly, markPayoutPaid);

export default router;
