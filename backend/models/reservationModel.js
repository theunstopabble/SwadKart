import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. "19:30"
    guests: { type: Number, required: true, min: 1, max: 20 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    specialRequests: { type: String, default: "" },
    qrCode: { type: String }, // Data URI or Cloudinary URL
    checkedInAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound index: prevent double booking same time slot
reservationSchema.index({ restaurant: 1, date: 1, time: 1, status: 1 });

export default mongoose.model("Reservation", reservationSchema);
