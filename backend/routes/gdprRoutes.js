import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { exportUserData, deleteUserAccount } from "../controllers/gdprController.js";

const router = express.Router();

router.get("/export", protect, exportUserData);
router.delete("/delete", protect, deleteUserAccount);

export default router;
