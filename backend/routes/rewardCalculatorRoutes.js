import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getLoyaltyTiers,
  calculateCoinEarnings,
  calculateCoinRedemption,
  calculateReferralReward,
  getCoinRates,
  getRewardBreakdown,
} from "../controllers/rewardCalculatorController.js";

const router = express.Router();

router.get("/tiers", protect, getLoyaltyTiers);
router.get("/rates", protect, getCoinRates);
router.post("/earn", protect, calculateCoinEarnings);
router.post("/redeem", protect, calculateCoinRedemption);
router.get("/referral", protect, calculateReferralReward);
router.get("/breakdown", protect, getRewardBreakdown);

export default router;