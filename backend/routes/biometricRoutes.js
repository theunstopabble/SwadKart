import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  registerBiometricStart,
  registerBiometricVerify,
  loginBiometricStart,
  loginBiometricVerify,
} from "../controllers/biometricController.js";

const router = express.Router();

// 🛡️ All routes protected (User must have a token/session first)
// Kyuki ye App Lock feature hai, user technically "Logged In" hai bas UI locked hai.

// Registration Flow (Profile -> Enable Fingerprint)
router.get("/register/start", protect, registerBiometricStart);
router.post("/register/verify", protect, registerBiometricVerify);

// Authentication Flow (App Open -> Unlock)
router.get("/login/start", protect, loginBiometricStart);
router.post("/login/verify", protect, loginBiometricVerify);

export default router;
