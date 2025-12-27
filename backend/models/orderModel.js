import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
  {
    // 1. Customer who placed the order (Login user)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    // 2. Order Details
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
        // Restaurant ID bhi store karte hain taaki owner ko order mile
        restaurant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Restaurant",
        },
      },
    ],

    // 3. Shipping Details (UPDATED 🛠️)
    shippingAddress: {
      fullName: { type: String, required: true }, // 👈 NEW: Receiver Name
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true }, // "India" (Backend ko khush rakhne ke liye)
      state: { type: String, required: true }, // 👈 NEW: State
      phone: { type: String, required: true }, // 👈 NEW: Phone Number
    },

    // 4. Payment Info
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },

    // 5. Pricing
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // 6. Payment Status
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

    // 7. Delivery Status
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },

    // 8. Delivery Assignment
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 9. Order Status
    orderStatus: {
      type: String,
      required: true,
      default: "Placed",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
