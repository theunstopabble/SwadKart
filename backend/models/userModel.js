import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, "Please add a name"] },
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
    phone: { type: String, required: [true, "Please add a phone number"], unique: true },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin", "delivery_partner", "restaurant_owner"],
      default: "user",
    },
    isAdmin: { type: Boolean, default: false },
    image: String,
    description: String,
    orderIndex: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // 🛰️ GEOSPATIAL AI (STEP 1): Delivery Partner Location in GeoJSON
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude] format
        default: [0, 0],
      },
    },
    isAvailable: { type: Boolean, default: true },

    // 💳 WALLET SYSTEM
    walletBalance: { type: Number, default: 0 },
    walletTransactions: [
      {
        amount: { type: Number, required: true },
        type: { type: String, enum: ["Credit", "Debit"], required: true },
        description: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    // 🔐 BIOMETRIC AUTHENTICATION (WebAuthn)
    biometricCredentials: [
      {
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: Buffer, required: true },
        counter: { type: Number, required: true },
        transports: [String],
        deviceType: { type: String },
        backedUp: { type: Boolean, default: false },
      },
    ],
    currentChallenge: { type: String },
    isBiometricEnabled: { type: Boolean, default: false },

    // 🔔 FCM PUSH NOTIFICATIONS
    fcmToken: { type: String },

    // 🪙 SWADCOINS LOYALTY SYSTEM
    swadCoins: { type: Number, default: 0, min: 0 },

    // 🔗 REFERRAL SYSTEM
    referralCode: { type: String, unique: true, sparse: true, uppercase: true },
    pendingReferralCode: { type: String, uppercase: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralRewardClaimed: { type: Boolean, default: false },

    // 🎟️ SWADPASS SUBSCRIPTION (FEAT-3)
    hasSwadPass: { type: Boolean, default: false },
    swadPassType: { type: String, enum: ["monthly", "yearly"], default: null },
    swadPassExpiry: { type: Date, default: null },
    swadPassStartedAt: { type: Date, default: null },

    // 🔐 TOKEN VERSION (JWT invalidation on password reset)
    tokenVersion: { type: Number, default: 0 },

    // 🏆 GAMIFICATION (FEAT-7)
    orderStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastOrderDate: { type: Date, default: null },
    badges: [
      {
        name: { type: String },
        description: { type: String },
        earnedAt: { type: Date, default: Date.now },
        icon: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// 🛡️ PASSWORD MATCHING METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔒 PRE-SAVE HOOK
userSchema.pre("save", async function () {
  try {
    if (this.isModified("role")) {
      this.isAdmin = this.role === "admin";
    }
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    if (!this.referralCode && this.role === "user") {
      this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    // BUG-10 FIX: Cap walletTransactions to last 100 entries
    if (this.walletTransactions && this.walletTransactions.length > 100) {
      this.walletTransactions = this.walletTransactions.slice(-100);
    }
  } catch (error) {
    throw new Error(error);
  }
});

// 🔑 RESET PASSWORD TOKEN GENERATION
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// 🔔 ADMIN ALERT HOOK
userSchema.post("save", function (doc) {
  const isNewUser = doc.createdAt.getTime() === doc.updatedAt.getTime();
  if (isNewUser) {
    setTimeout(async () => {
      try {
        const adminMail = process.env.SMTP_MAIL;
        if (!adminMail) return;

        await sendEmail({
          email: adminMail,
          subject: "🆕 New User Registration Alert - SwadKart",
          html: `
            <div style="font-family: sans-serif; border: 2px solid #ef4444; padding: 25px; border-radius: 15px; background-color: #000; color: #fff; max-width: 600px;">
              <h1 style="color: #ef4444; text-align: center;">New Entry Detected! 🚀</h1>
              <div style="background: #111; padding: 20px; border-radius: 10px; border: 1px solid #333; line-height: 1.8;">
                <p><strong>👤 Name:</strong> ${doc.name}</p>
                <p><strong>📧 Email:</strong> ${doc.email}</p>
                <p><strong>🛡️ Role:</strong> ${doc.role}</p>
                <p><strong>📞 Phone:</strong> ${doc.phone || "N/A"}</p>
              </div>
            </div>
          `,
        });
      } catch (error) {
        console.error("❌ Admin Alert Failed:", error.message);
      }
    }, 1000);
  }
});

// 🚀 PERFORMANCE FIX (STEP 1): Indexing
// Email index is auto-created by unique: true in schema definition above
userSchema.index({ role: 1 });

// 🛰️ GEOSPATIAL FIX (STEP 1): 2dsphere index for location queries
userSchema.index({ currentLocation: "2dsphere" });

const User = mongoose.model("User", userSchema);
export default User;
