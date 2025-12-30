import express from "express";
import { chatWithGenie } from "../controllers/chatController.js";

const router = express.Router();

// Public route - anyone can chat
router.post("/", chatWithGenie);

export default router;
