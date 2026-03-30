import mongoose from "mongoose";

// Schema to track which user used which coupon and in which order
const couponUsageSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Add a compound index to quickly find if a user has already used a specific coupon
couponUsageSchema.index({ user: 1, coupon: 1 }, { unique: true });

const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;
