import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    image: {
      type: String,
    },
    description: {
      type: String,
    },
    // Shop Reordering Index
    orderIndex: {
      type: Number,
      default: 0,
    },
    // OTP Security Fields
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Password matching method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 👇 CRITICAL FIX: Removed 'next' parameter completely.
// Now using Pure Async/Await (Modern Mongoose Standard)
userSchema.pre("save", async function () {
  // 1. अगर पासवर्ड बदला नहीं गया है, तो return कर दें (next() की जरूरत नहीं)
  if (!this.isModified("password")) {
    return;
  }

  // 2. हैश करें
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // async function अपने आप promise resolve करेगा, next() की जरूरत नहीं
});

// Reset password token generation
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
