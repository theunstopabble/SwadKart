import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  calculateDriverEarnings,
  getDriverPayoutHistory,
  getDriverIncentives,
} from "../controllers/driverEarningsController.js";

const router = express.Router();

router.post("/calculate", protect, authorizeRoles("delivery_partner", "admin"), calculateDriverEarnings);
router.get("/payout-history", protect, authorizeRoles("delivery_partner", "admin"), getDriverPayoutHistory);
router.get("/incentives", protect, authorizeRoles("delivery_partner", "admin"), getDriverIncentives);

export default router;