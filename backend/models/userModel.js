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
      lowercase: true, // Email hamesha lowercase mein save hoga
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
    },
    phone: {
      type: String,
    },
    // 🔥 Role Management with Enum for Security
    role: {
      type: String,
      required: true,
      enum: ["user", "admin", "delivery_partner", "restaurant_owner"],
      default: "user",
    },
    // 🔥 Admin Flag (Backwards compatibility and quick checks)
    isAdmin: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
    },
    description: {
      type: String,
    },
    // Shop Reordering Index (For Restaurant Owners)
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

// ==========================================
// 🛡️ PASSWORD MATCHING METHOD
// ==========================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==========================================
// 🔒 PASSWORD HASHING (Modern Pre-Save)
// ==========================================
userSchema.pre("save", async function (next) {
  // 1. Sync isAdmin flag based on role
  if (this.isModified("role")) {
    this.isAdmin = this.role === "admin";
  }

  // 2. Hash password if modified
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
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

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
