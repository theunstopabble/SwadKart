import mongoose from "mongoose";

const payoutSchema = mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Restaurant",
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "paid", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    // Orders included in this payout
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    // Payment details
    utrNumber: { type: String, default: null }, // UTR / reference number
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

payoutSchema.index({ restaurant: 1, status: 1 });
payoutSchema.index({ createdAt: -1 });

const Payout = mongoose.model("Payout", payoutSchema);
export default Payout;
