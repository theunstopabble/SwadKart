import mongoose from "mongoose";

const restaurantSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, default: "Main Street, City" },
    image: { type: String },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    // 👇 Sabse Zaruri: Ownership
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    // 👇 Approval & Dummy Logic
    isVerified: {
      type: Boolean,
      default: false, // Naya restaurant hamesha false rahega jab tak admin approve na kare
    },
    isDummy: {
      type: Boolean,
      default: false, // Seeded data ke liye true
    },
    isActive: { type: Boolean, default: true },

    openingTime: { type: String, default: "10:00" },
    closingTime: { type: String, default: "22:00" },
    isOpenNow: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
