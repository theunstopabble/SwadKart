import mongoose from "mongoose";

const supportMessageSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    phone: { type: String, required: true },
    name: { type: String, default: "" },
    message: { type: String, required: true, maxlength: 2000 },
    sessionId: { type: String, default: "" },
    chatId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

supportMessageSchema.index({ status: 1, createdAt: -1 });
supportMessageSchema.index({ phone: 1 });
supportMessageSchema.index({ user: 1 });

const SupportMessage = mongoose.model("SupportMessage", supportMessageSchema);
export default SupportMessage;
