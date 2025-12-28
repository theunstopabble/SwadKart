import mongoose from "mongoose";

const restaurantSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, default: "Main Street, City" },
    image: { type: String },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    // 👇 Sabse Zaruri: Ye Restaurant kis User ka hai?
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
