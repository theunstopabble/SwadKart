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

    // ✅ FIXED: Added isActive field
    // Ab naya user/dummy data hamesha active rahega
    isActive: { type: Boolean, default: true },

    isAdmin: { type: Boolean, default: false },
    image: String,
    description: String,
    orderIndex: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    
    // OTP & Reset Tokens
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
  },
  { timestamps: true }
);

// 🛡️ PASSWORD MATCHING METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔒 PRE-SAVE HOOK (Hashing & Role Sync)
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
  } catch (error) {
    throw new Error(error);
  }
});

// 🔔 ADMIN ALERT HOOK (Post-Save)
userSchema.post("save", function (doc) {
  // Check if newly created
  const isNewUser = doc.createdAt.getTime() === doc.updatedAt.getTime();

  if (isNewUser) {
    setTimeout(async () => {
      try {
        const adminMail = process.env.SMTP_MAIL;

        if (!adminMail) {
          console.warn("⚠️ Admin Alert Skipped: SMTP_MAIL not set in .env");
          return;
        }

        console.log(`🚀 Dispatching Registration Alert for: ${doc.email}`);

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
                <p><strong>⚡ Status:</strong> ${doc.isActive ? "Active" : "Inactive"}</p>
                <p><strong>📞 Phone:</strong> ${doc.phone || "N/A"}</p>
              </div>
            </div>
          `,
        });
        console.log("✅ Admin Notified Successfully!");
      } catch (error) {
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
