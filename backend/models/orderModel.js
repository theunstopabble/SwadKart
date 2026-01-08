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
      // ✅ NEW: For Heatmap + LiveTracking
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
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
    // 💰 5. PRICING & COUPON LOGIC
    // =================================================
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },

    // 👇 Coupon Calculation
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, required: true, default: 0.0 },

    // itemsPrice + taxPrice + shippingPrice - couponDiscount
    totalPrice: { type: Number, required: true, default: 0.0 },

    // =================================================
    // ✅ 6. PAYMENT STATUS
    // =================================================
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

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
      type: Number, // 4 Digit code
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
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
