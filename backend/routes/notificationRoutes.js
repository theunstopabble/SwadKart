import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import {
  sendNotification,
  getMyNotifications,
  markRead,
  sendBulkNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/my", authenticateToken, getMyNotifications);
router.patch("/read", authenticateToken, markRead);
router.post("/send", authenticateToken, adminOnly, sendNotification);
router.post("/bulk", authenticateToken, adminOnly, sendBulkNotification);

export default router;
