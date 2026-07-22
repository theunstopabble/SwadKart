import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  calculateDeliveryFee,
  calculateDeliveryRoute,
  getDeliveryEarningsProjection,
} from "../controllers/deliveryCalculatorController.js";

const router = express.Router();

router.post("/fee", protect, authorizeRoles("user", "admin", "restaurant_owner"), calculateDeliveryFee);
router.post("/route", protect, authorizeRoles("delivery_partner", "admin", "restaurant_owner"), calculateDeliveryRoute);
router.get("/earnings", protect, authorizeRoles("delivery_partner", "admin"), getDeliveryEarningsProjection);

export default router;