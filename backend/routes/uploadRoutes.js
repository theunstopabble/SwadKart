import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js"; // 👈 Import from config

const router = express.Router();

// 1. Upload Logic (Uses Cloudinary Storage directly)
const upload = multer({ storage });

// 2. Route Definition
router.post("/", upload.single("image"), (req, res) => {
  try {
    // Cloudinary automatically provides the URL in req.file.path
    res.send({
      message: "Image Uploaded Successfully",
      image: req.file.path, // 👈 This is the Cloudinary URL (https://...)
    });
  } catch (error) {
    console.error(error);
    res.status(400).send({ message: "Image upload failed" });
  }
});

export default router;
