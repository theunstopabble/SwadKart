import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createReservation,
  getMyReservations,
  cancelReservation,
  updateReservationStatus,
  getRestaurantReservations,
} from "../controllers/reservationController.js";

const router = express.Router();

router.post("/", protect, createReservation);
router.get("/my", protect, getMyReservations);
router.delete("/:id", protect, cancelReservation);
router.patch("/:id/status", protect, authorizeRoles("admin", "restaurant_owner"), updateReservationStatus);
router.get("/restaurant/:id", protect, authorizeRoles("admin", "restaurant_owner"), getRestaurantReservations);

export default router;
