import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getRevenueProjection,
  getOrderVolumeForecast,
  getDemandAnalytics,
  getProfitLossProjection,
} from "../controllers/analyticsForecastController.js";

const router = express.Router();

router.get("/revenue-projection", protect, authorizeRoles("admin", "restaurant_owner"), getRevenueProjection);
router.get("/order-forecast", protect, authorizeRoles("admin", "restaurant_owner"), getOrderVolumeForecast);
router.get("/demand", protect, authorizeRoles("admin", "restaurant_owner"), getDemandAnalytics);
router.get("/profit-loss", protect, authorizeRoles("admin"), getProfitLossProjection);

export default router;