import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
  {
    // =================================================
    // 👤 1. CUSTOMER INFO
    // =================================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    // =================================================
    // 🍔 2. ORDER ITEMS
    // =================================================
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        // 👇 Linked to Restaurant Model (Crucial for Multi-Vendor)
        restaurant: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Restaurant",
        },
      },
    ],

    // =================================================
    // 📍 3. SHIPPING DETAILS (FULL INFO)
    // =================================================
    shippingAddress: {
      fullName: { type: String, required: true }, // Receiver Name
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      state: { type: String, required: true },
      phone: { type: String, required: true }, // Driver needs this to call
    },

    // =================================================
    // 💳 4. PAYMENT INFO
    // =================================================
    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },

    // =================================================
    // 💰 5. PRICING
    // =================================================
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // =================================================
    // ✅ 6. PAYMENT STATUS
    // =================================================
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

    // =================================================
    // 📦 7. DELIVERY STATUS (Global)
    // =================================================
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },

    // =================================================
    // 🛵 8. DELIVERY PARTNER LOGIC (Advanced)
    // =================================================
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // 👇 Tracks if Driver Accepted/Rejected
    deliveryStatus: {
      type: String,
      enum: ["None", "Assigned", "Accepted", "Rejected"],
      default: "None",
    },

    // =================================================
    // 🔄 9. ORDER LIFECYCLE (Status + Cancellation)
    // =================================================
    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Preparing",
        "Ready", // Food ready, waiting for driver
        "Out for Delivery",
        "Delivered",
        "Cancelled", // 👈 For User Cancellation
      ],
      required: true,
      default: "Placed",
    },
    // 👇 Cancellation Details
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
