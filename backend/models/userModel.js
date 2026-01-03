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
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
    },
    phone: {
      type: String,
      required: [true, "Please add a phone number"],
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin", "delivery_partner", "restaurant_owner"],
      default: "user",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    image: String,
    description: String,
    orderIndex: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // For Delivery Partners
    currentLocation: { lat: Number, lng: Number },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ==========================================
// 🛡️ PASSWORD MATCHING METHOD
// ==========================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==========================================
// 🔒 PASSWORD HASHING (✅ PURE ASYNC FIX)
// ==========================================
// Note: Humne yahan se 'next' parameter hata diya hai.
// Async function automatic Promise return karta hai, isliye next() ki zaroorat nahi hai.

userSchema.pre("save", async function () {
  // 1. Sync isAdmin flag based on role
  if (this.isModified("role")) {
    this.isAdmin = this.role === "admin";
  }

  // 2. Agar password modify nahi hua to kuch mat karo (return)
  if (!this.isModified("password")) {
    return;
  }

  // 3. Password Hash karo
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Yahan next() call karne ki zaroorat nahi hai.
});

// ==========================================
// 🔑 RESET PASSWORD TOKEN GENERATION
// ==========================================
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
