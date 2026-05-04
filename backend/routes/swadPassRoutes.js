import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getSwadPassStatus,
  subscribeSwadPass,
  cancelSwadPass,
} from "../controllers/swadPassController.js";

const router = express.Router();

router.get("/status", protect, getSwadPassStatus);
router.post("/subscribe", protect, subscribeSwadPass);
router.delete("/cancel", protect, cancelSwadPass);

export default router;
