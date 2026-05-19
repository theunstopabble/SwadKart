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
  },
);

const productSchema = mongoose.Schema(
  {
    // =================================================
    // 🔗 1. OWNERSHIP & LINKS
    // =================================================
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
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

    // 📊 COST & PROFIT CALCULATOR (Enterprise)
    ingredients: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true }, // kg, g, ml, L, piece, etc.
        unitCost: { type: Number, required: true }, // cost per unit in INR
      },
    ],
    foodCostPercentage: { type: Number, default: 30 }, // target food cost %
    preparationCost: { type: Number, default: 0 }, // labor cost per unit
    packagingCost: { type: Number, default: 5 }, // packaging cost per unit
    marginTarget: { type: Number, default: 25 }, // target margin %
    lastCostUpdated: { type: Date, default: null },

    // 📦 SMART INVENTORY (FEAT-14)
    isAvailable: { type: Boolean, default: true },
    autoDisable: { type: Boolean, default: true }, // Auto-disable when stock hits 0
    lastRestocked: { type: Date, default: null },

    // 🏷️ TAGS (Chatbot RAG enhancement)
    tags: { type: [String], default: [] },

    // ⏰ AVAILABILITY SCHEDULING (FEAT-7)
    scheduleEnabled: { type: Boolean, default: false },
    schedule: {
      days: {
        type: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
        default: [],
      },
      startTime: { type: String, default: "00:00" }, // HH:mm format
      endTime: { type: String, default: "23:59" },   // HH:mm format
    },

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
  },
);

// 🚀 PERFORMANCE FIX (STEP 1): Indexing
productSchema.index({ restaurant: 1 });
productSchema.index({ category: 1 });
// 🔍 Weighted text index for chatbot RAG retrieval
productSchema.index(
  { name: "text", tags: "text", category: "text", description: "text" },
  { weights: { name: 10, tags: 5, category: 3, description: 1 } }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
