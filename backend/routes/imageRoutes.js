import express from "express";
import { generateThumbnail } from "../controllers/imageController.js";

const router = express.Router();

router.get("/thumbnail", generateThumbnail);

export default router;
