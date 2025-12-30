import mongoose from "mongoose";

const productSchema = mongoose.Schema(
  {
    // =================================================
    // 🔗 1. OWNERSHIP & LINKS
    // =================================================
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Frontend compatibility ke liye 'user' field bhi rakha hai
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =================================================
    // 🍕 2. BASIC DETAILS
    // =================================================
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },

    // Base Price (agar koi variant select na ho)
    price: {
      type: Number,
      required: true,
    },

    // =================================================
    // 🛠️ 3. CUSTOMIZATION (NEW FEATURES)
    // =================================================

    // 👇 Variants: (e.g., Size: Half/Full or Small/Large)
    // Inka price base price ko replace karega (Logic Frontend par handle hoga)
    variants: [
      {
        name: { type: String, required: true }, // e.g., "Large"
        price: { type: Number, required: true }, // e.g., 250
      },
    ],

    // 👇 Add-ons: (e.g., Extra Cheese, Add Coke)
    // Ye price total mein JUD jayega (Added cost)
    addons: [
      {
        name: { type: String, required: true }, // e.g., "Extra Cheese"
        price: { type: Number, required: true }, // e.g., 50
      },
    ],

    // =================================================
    // ⚙️ 4. SETTINGS & STOCK
    // =================================================
    isVeg: {
      type: Boolean,
      default: true,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 100,
    },

    // Sorting Order for Menu
    orderIndex: {
      type: Number,
      default: 0,
    },

    // =================================================
    // ⭐ 5. RATINGS
    // =================================================
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
