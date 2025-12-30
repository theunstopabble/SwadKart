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
    // 🍔 2. ORDER ITEMS (Updated with Customization)
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
        // 👇 Linked to Restaurant
        restaurant: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User", // Note: Ensure this matches your User model (Restaurant Owner)
        },

        // ⭐ NEW FIELDS FOR VARIANTS & ADD-ONS ⭐
        selectedVariant: {
          type: Object, // Stores { name: "Large", price: 500 }
          default: null,
        },
        selectedAddons: {
          type: Array, // Stores [{ name: "Cheese", price: 50 }, ...]
          default: [],
        },
      },
    ],

    // =================================================
    // 📍 3. SHIPPING DETAILS (FULL INFO)
    // =================================================
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      state: { type: String, required: true },
      phone: { type: String, required: true },
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

    // 👇 Coupon Info
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, required: true, default: 0.0 },

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
    // 🛵 8. DELIVERY PARTNER LOGIC
    // =================================================
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: ["None", "Assigned", "Accepted", "Rejected"],
      default: "None",
    },

    // =================================================
    // 🔄 9. ORDER LIFECYCLE
    // =================================================
    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Preparing",
        "Ready",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      required: true,
      default: "Placed",
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
