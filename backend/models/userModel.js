import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, required: true, default: "user" },
    image: { type: String },
    description: { type: String },

    // Shop Reordering indexing field
    orderIndex: { type: Number, default: 0 },

    // OTP Security Fields
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Password matching method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 👇 CORRECTED HASHING MIDDLEWARE
userSchema.pre("save", async function (next) {
  // 1. Agar password badla nahi gaya hai, toh turant return karke aage badhein
  if (!this.isModified("password")) {
    return next(); // 👈 'return' lagana bahut zaroori hai!
  }

  // 2. Agar password badla hai, toh hashing karein
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(); // 👈 Hashing ke baad aage badhein
  } catch (error) {
    next(error); // 👈 Agar koi error aaye toh Mongoose ko batayein
  }
});

// Reset password token generation
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
