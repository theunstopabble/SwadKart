import mongoose from "mongoose";

const restaurantSchema = mongoose.Schema(
  {
    // 👇 Basic Info
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, default: "Main Street, City" },
    image: { type: String },

    // 👇 Stats
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    // 👇 Ownership (Link to User)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    // 👇 APPROVAL LOGIC (The Fix)
    isVerified: {
      type: Boolean,
      required: true,
      default: false, // Default false: Pending authorization
    },

    // 👇 Operational Status
    isActive: { type: Boolean, default: true }, // Can owner turn it off?
    isDummy: { type: Boolean, default: false }, // For seeded data

    // 👇 Timings
    openingTime: { type: String, default: "10:00" },
    closingTime: { type: String, default: "22:00" },
    isOpenNow: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
