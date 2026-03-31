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
    // 🍔 2. ORDER ITEMS (Customization Ready)
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
        // 👇 Linked to Restaurant Owner
        restaurant: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
        // ⭐ Variants & Add-ons
        selectedVariant: {
          type: Object,
          default: null,
        },
        selectedAddons: {
          type: Array,
          default: [],
        },
      },
    ],

    // =================================================
    // 📍 3. SHIPPING DETAILS
    // =================================================
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      state: { type: String, required: true },
      phone: { type: String, required: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    // =================================================
    // 💳 4. PAYMENT INFO (STEP 2: Wallet System Added)
    // =================================================
    paymentMethod: {
      type: String,
      required: true,
      enum: ["COD", "Online", "Wallet"], // 👈 WALLET ADDED HERE
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },

    // =================================================
    // 💰 5. PRICING & COUPON LOGIC
    // =================================================
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // =================================================
    // ✅ 6. PAYMENT STATUS
    // =================================================
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    refundStatus: {
      type: String,
      enum: ["None", "Pending", "Processed", "Failed"],
      default: "None",
    },

    // =================================================
    // 📦 7. DELIVERY & PARTNER LOGIC
    // =================================================
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: [
        "None",
        "Assigned",
        "Accepted",
        "Rejected",
        "Out for Delivery",
        "Delivered",
      ],
      default: "None",
    },
    deliveryOTP: {
      type: Number,
    },

    // =================================================
    // 🔄 8. ORDER LIFECYCLE
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
  },
);

// 🚀 PERFORMANCE FIX (STEP 1): Indexing for fast queries
orderSchema.index({ user: 1 });
orderSchema.index({ "orderItems.restaurant": 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
