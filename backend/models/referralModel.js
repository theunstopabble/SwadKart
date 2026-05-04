import mongoose from "mongoose";

const referralSchema = mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    referralCode: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "paid"],
      default: "pending",
    },
    rewardAmount: { type: Number, default: 50 },
    // When referee places first paid order
    firstOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referee: 1 }, { unique: true });

const Referral = mongoose.model("Referral", referralSchema);
export default Referral;
