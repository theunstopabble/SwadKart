import mongoose from "mongoose";

const whatsappLogSchema = mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document", "template", "otp", "unknown"],
      default: "text",
    },
    sessionId: { type: String, default: "" },
    chatId: { type: String, default: "" },
    phone: { type: String },
    messageId: { type: String },
    body: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed", "cancelled"],
      default: "pending",
    },
    error: { type: String, default: null },
    durationMs: { type: Number, default: 0 },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    batchId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

whatsappLogSchema.index({ phone: 1, createdAt: -1 });
whatsappLogSchema.index({ status: 1 });
whatsappLogSchema.index({ user: 1 });
whatsappLogSchema.index({ createdAt: -1 });

const WhatsAppLog = mongoose.model("WhatsAppLog", whatsappLogSchema);
export default WhatsAppLog;
