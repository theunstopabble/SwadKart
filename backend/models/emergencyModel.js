import mongoose from "mongoose";

const emergencySchema = mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    status: {
      type: String,
      enum: ["Active", "Resolved"],
      default: "Active",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

emergencySchema.index({ driver: 1, status: 1 });
emergencySchema.index({ status: 1 });

const Emergency = mongoose.model("Emergency", emergencySchema);
export default Emergency;
