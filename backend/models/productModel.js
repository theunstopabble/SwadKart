import mongoose from "mongoose";

// =================================================
// ⭐ 0. REVIEW SCHEMA
// =================================================
const reviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =================================================
    // 🍕 2. BASIC DETAILS
    // =================================================
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },

    // =================================================
    // 🛠️ 3. CUSTOMIZATION (Core of Phase 2)
    // =================================================
    variants: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    addons: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],

    // =================================================
    // ⚙️ 4. SETTINGS & STOCK
    // =================================================
    isVeg: { type: Boolean, default: true },
    isRecommended: { type: Boolean, default: false },
    countInStock: { type: Number, required: true, default: 100 },
    orderIndex: { type: Number, default: 0 },

    // =================================================
    // ⭐ 5. REVIEWS & RATINGS
    // =================================================
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
