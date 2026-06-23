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
    tableNumber: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Index for looking up reservations by user
reservationSchema.index({ user: 1 });

// Compound unique index: prevent double booking the same table at the same slot
reservationSchema.index(
  { restaurant: 1, date: 1, time: 1, tableNumber: 1 },
  { unique: true },
);

export default mongoose.model("Reservation", reservationSchema);
