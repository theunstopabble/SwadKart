import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["order", "delivery", "promotion", "system", "inventory", "payout"],
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // Arbitrary payload (orderId, restaurantId, etc.)
    read: { type: Boolean, default: false, index: true },
    sentVia: {
      type: [String],
      enum: ["push", "email", "sms", "in_app"],
      default: [],
    },
    // For push notification tracking
    fcmSent: { type: Boolean, default: false },
    fcmResponse: { type: String, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
