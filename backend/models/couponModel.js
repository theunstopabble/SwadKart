import mongoose from "mongoose";

const couponSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    maxDiscountAmount: {
      type: Number,
      default: 500,
    },
    minOrderValue: {
      type: Number,
      required: true,
      default: 0,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // ✅ Ab yeh sahi jagah par hai (Inside the schema object)
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
