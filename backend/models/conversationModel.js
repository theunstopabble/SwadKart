import mongoose from "mongoose";

// =================================================
// 💬 MESSAGE SCHEMA (embedded subdocument)
// =================================================
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      enum: [
        "order_inquiry",
        "recommendation",
        "complaint",
        "navigation_help",
        "order_placement",
        "general_chat",
        "greeting",
        "farewell",
        "unknown",
      ],
      default: undefined, // only set on user messages
    },
    sentiment: {
      type: Number,
      min: -1.0,
      max: 1.0,
      default: undefined, // only set on user messages
    },
    language: {
      type: String,
      enum: [
        "English",
        "Hindi",
        "Hinglish",
        "Tamil",
        "Telugu",
        "Bengali",
        "Marathi",
      ],
      default: undefined,
    },
    attachments: [
      {
        name: String,
        type: String,
        size: Number,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// =================================================
// 🗂️ CONVERSATION SCHEMA
// =================================================
const conversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    language: {
      type: String,
      default: "English",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    escalationFlag: {
      type: Boolean,
      default: false,
    },
    lastResponseMs: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// 🚀 INDEXES for performance
conversationSchema.index({ updatedAt: 1 }); // 90-day cleanup sweep
conversationSchema.index({ userId: 1, updatedAt: -1 }); // history listing
conversationSchema.index({ createdAt: 1 }); // analytics date-range queries

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
