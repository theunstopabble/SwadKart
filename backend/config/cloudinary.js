import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// 1. Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Storage Setup (Jahan images save hongi)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "swadkart_products", // Cloudinary par is naam ka folder banega
    allowedFormats: ["jpeg", "png", "jpg", "webp"],
  },
});

export { cloudinary, storage };
