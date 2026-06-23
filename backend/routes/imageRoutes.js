import express from "express";
import { generateThumbnail } from "../controllers/imageController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const thumbnailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});

router.get("/thumbnail", thumbnailLimiter, generateThumbnail);

export default router;
