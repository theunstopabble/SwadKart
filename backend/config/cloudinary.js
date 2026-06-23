import { v2 as cloudinary } from "cloudinary";
import multerStorageCloudinary from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Fix for library import compatibility
const CloudinaryStorage =
  multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

const requiredCloudinaryVars = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missingCloudinaryVars = requiredCloudinaryVars.filter((v) => !process.env[v]);
if (missingCloudinaryVars.length > 0) {
  throw new Error(`Missing Cloudinary env vars: ${missingCloudinaryVars.join(", ")}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Storage Setup (FIXED)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,

  params: {
    folder: "swadkart_products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

export { cloudinary, storage };
