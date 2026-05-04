import mongoose from "mongoose";

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true },
);

const restaurantSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    image: {
      type: String,
      required: true,
      default: "https://placehold.co/600x400/png?text=Restaurant",
    },
    description: { type: String, default: "" },
    address: { type: String, required: true },

    // ✅ CRITICAL: Link to Owner (User)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },

    // 🚦 Operational Flags
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDummy: { type: Boolean, default: false }, // ✅ Dummy shops ke liye zaroori
    isOpenNow: { type: Boolean, default: true },

    // ⏰ Timings
    openingTime: { type: String, default: "09:00" },
    closingTime: { type: String, default: "23:00" },

    // 📊 PERFORMANCE SCORE (FEAT-9)
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },
    scoreMetrics: {
      deliveryTimeScore: { type: Number, default: 0 },
      ratingScore: { type: Number, default: 0 },
      volumeScore: { type: Number, default: 0 },
      cancellationScore: { type: Number, default: 0 },
      lastCalculatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// 🚀 PERFORMANCE FIX (STEP 1): Indexing
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ isVerified: 1 });
restaurantSchema.index({ isActive: 1 });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
