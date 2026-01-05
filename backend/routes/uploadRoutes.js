import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post("/", protect, (req, res) => {
  upload.single("image")(req, res, (err) => {
    // 1. Error Handling
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer Error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    // 2. File Check
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // 🔍 DEBUGGING: Terminal me check karo ki Cloudinary ne kya bheja
    console.log("☁️ Cloudinary Response:", req.file);

    // 🛠️ SMART FIX: URL kahin bhi ho, hum dhund lenge
    // Cloudinary kabhi 'path', kabhi 'secure_url', kabhi 'url' bhejta hai
    const imageUrl = req.file.path || req.file.secure_url || req.file.url;

    if (!imageUrl) {
      return res
        .status(500)
        .json({ message: "Image uploaded but URL not found!" });
    }

    // 3. Success Response
    res.status(200).json({
      message: "Image Uploaded Successfully",
      image: imageUrl,
    });
  });
});

export default router;
