import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import multerStorageCloudinary from "multer-storage-cloudinary";

dotenv.config();

// 🛠️ UNIVERSAL FIX: CloudinaryStorage ko dhoondne ka logic
// Kabhi ye direct hota hai, kabhi .default ke andar, kabhi .CloudinaryStorage ke andar
const CloudinaryStorage =
  multerStorageCloudinary.CloudinaryStorage ||
  multerStorageCloudinary.default?.CloudinaryStorage ||
  multerStorageCloudinary.default ||
  multerStorageCloudinary;

// 1. Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Storage Setup
// Ab 'CloudinaryStorage' ek valid Constructor hona chahiye
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "swadkart_products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

export { cloudinary, storage };
