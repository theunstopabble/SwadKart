import mongoose from "mongoose";

/**
 * FEAT-22: Subscription Meal Plans
 * Daily / Weekly / Custom tiffin subscriptions
 */
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      required: true,
    },
    planName: { type: String, required: true }, // e.g. "Veg Thali - Lunch"
    mealsPerDay: { type: Number, default: 2, min: 1, max: 4 }, // breakfast, lunch, snack, dinner
    schedule: {
      days: [
        {
          type: String,
          enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        },
      ],
      mealTimes: [{ type: String, default: "12:30" }], // HH:MM
    },
    preferences: {
      isVeg: { type: Boolean, default: true },
      spiceLevel: { type: String, enum: ["mild", "medium", "hot", "extra-hot"], default: "medium" },
      allergies: [{ type: String }], // e.g. ["peanuts", "gluten"]
      notes: { type: String }, // e.g. "Less oil, no garlic"
    },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" }, // optional tied restaurant
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        qty: { type: Number, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    pricing: {
      perMealPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      discountPercent: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "expired"],
      default: "active",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // null = ongoing
    nextDeliveryDate: { type: Date },
    deliveries: [
      {
        date: { type: Date, required: true },
        status: {
          type: String,
          enum: ["scheduled", "preparing", "out-for-delivery", "delivered", "skipped", "cancelled"],
          default: "scheduled",
        },
        deliveredAt: { type: Date },
        otp: { type: String }, // TODO: hash before storing — do NOT store plain text
        rider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    autoRenew: { type: Boolean, default: true },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ nextDeliveryDate: 1, status: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
