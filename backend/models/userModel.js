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
    phone: { type: String, required: [true, "Please add a phone number"] },
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

    // For Delivery Partners
    currentLocation: { lat: Number, lng: Number },
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
    // Stores registered authenticators (Fingerprint/FaceID)
    biometricCredentials: [
      {
        credentialID: { type: String, required: true }, // Base64URL ID
        credentialPublicKey: { type: Buffer, required: true }, // Public Key (Binary)
        counter: { type: Number, required: true }, // Replay attack protection
        transports: [String], // e.g., ['internal', 'hybrid']
        deviceType: { type: String }, // e.g., 'singleDevice' or 'multiDevice'
        backedUp: { type: Boolean, default: false },
      },
    ],
    // Stores the temporary challenge during registration/login flow
    currentChallenge: { type: String },

    // 🔒 Biometric Status (Industry Standard - Synced to DB)
    isBiometricEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 🛡️ PASSWORD MATCHING METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔒 PRE-SAVE HOOK (Hashing & Role Sync)
// ✅ FIXED: Removed 'next' parameter. Modern Mongoose automatically handles async hooks.
userSchema.pre("save", async function () {
  try {
    // Role to Admin Sync
    if (this.isModified("role")) {
      this.isAdmin = this.role === "admin";
    }

    // Password Hashing
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Yahan next() call nahi karna hai, async function apne aap complete ho jata hai.
  } catch (error) {
    throw new Error(error);
  }
});

// 🔔 ADMIN ALERT HOOK (Post-Save)
// ✅ FIXED: post hooks strictly should not use 'next' with async logic.
userSchema.post("save", function (doc) {
  // Check if newly created (createdAt and updatedAt match)
  const isNewUser = doc.createdAt.getTime() === doc.updatedAt.getTime();

  if (isNewUser) {
    setTimeout(async () => {
      try {
        // 🛠️ FIX: Hardcoded email hata diya.
        // Ab ye sirf Environment Variable (.env) se email uthayega.
        const adminMail = process.env.SMTP_MAIL;

        if (!adminMail) {
          console.warn("⚠️ Admin Alert Skipped: SMTP_MAIL not set in .env");
          return; // Email nahi hai to yahi ruk jao (Crash nahi hoga)
        }

        console.log(`🚀 Dispatching Registration Alert for: ${doc.email}`);

        await sendEmail({
          email: adminMail, // ✅ Using Secure Variable
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
        console.log("✅ Admin Notified Successfully!");
      } catch (error) {
        // Silent fail (server crash hone se bachega)
        console.error("❌ Admin Alert Failed:", error.message);
      }
    }, 1000);
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

const User = mongoose.model("User", userSchema);
export default User;
