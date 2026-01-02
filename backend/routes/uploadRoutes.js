import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js"; // 🛡️ Security ke liye

const router = express.Router();

// 🛠️ File Filter: Taaki sirf images hi upload ho sakein
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

// @desc    Upload image to Cloudinary
// @route   POST /api/v1/upload
// @access  Private (Only logged in users)
router.post("/", protect, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer related errors (e.g. File too large)
      return res.status(400).json({ message: `Multer Error: ${err.message}` });
    } else if (err) {
      // Other errors (e.g. Invalid file type)
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // 🔥 Success: Cloudinary URL returns in req.file.path
    res.status(200).json({
      message: "Image Uploaded Successfully",
      image: req.file.path,
    });
  });
});

export default router;
