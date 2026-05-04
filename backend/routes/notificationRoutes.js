import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  sendNotification,
  getMyNotifications,
  markRead,
  sendBulkNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/my", protect, getMyNotifications);
router.patch("/read", protect, markRead);
router.post("/send", protect, adminOnly, sendNotification);
router.post("/bulk", protect, adminOnly, sendBulkNotification);

export default router;
