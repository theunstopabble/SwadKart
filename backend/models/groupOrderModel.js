import mongoose from "mongoose";

/**
 * FEAT-27: Group Ordering / Split Bill
 */
const groupOrderSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["open", "ordering", "placed", "cancelled"],
      default: "open",
    },
    expiresAt: { type: Date, required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        items: [
          {
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            name: { type: String, required: true },
            qty: { type: Number, default: 1 },
            price: { type: Number, required: true },
          },
        ],
        subtotal: { type: Number, default: 0 },
        shareOfDeliveryFee: { type: Number, default: 0 },
        shareOfTax: { type: Number, default: 0 },
        tip: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        paid: { type: Boolean, default: false },
      },
    ],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        qty: { type: Number, default: 1 },
        price: { type: Number, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    deliveryFee: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 5 },
    totalCartValue: { type: Number, default: 0 },
    finalOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    splitType: { type: String, enum: ["equal", "itemwise"], default: "itemwise" },
  },
  { timestamps: true },
);

// inviteCode already has index: true + unique: true in schema field definition
groupOrderSchema.index({ host: 1, status: 1 });
groupOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GroupOrder = mongoose.model("GroupOrder", groupOrderSchema);
export default GroupOrder;
