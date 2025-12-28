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

    // 👇 Admin Dashboard में Shop Reordering के लिए indexing field
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

// 👇 CRITICAL FIX: Hashing Middleware
// 'next is not a function' एरर को रोकने के लिए 'return next()' का उपयोग किया गया है
userSchema.pre("save", async function (next) {
  // 1. अगर पासवर्ड बदला नहीं गया है (जैसे forgot password के दौरान), तो तुरंत आगे बढ़ें
  if (!this.isModified("password")) {
    return next(); // 👈 'return' लगाना अनिवार्य है
  }

  // 2. अगर पासवर्ड बदला है, तो उसे हैश करें
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Reset password token generation
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  // टोकन को हैश करके डेटाबेस में स्टोर करना
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // टोकन की वैधता 10 मिनट के लिए सेट करना
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
