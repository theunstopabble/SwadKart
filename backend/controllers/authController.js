import crypto from "crypto";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";
import {
  getOtpTemplate,
  getResetPasswordTemplate,
  getWelcomeTemplate,
} from "../utils/emailTemplates.js";

// @desc    Register user (Sends OTP via Email Only)
export const registerUser = async (req, res, next) => {
  try {
    const { name, email: rawEmail, password, phone: rawPhone, role } = req.body;

    if (!name || !rawEmail || !password || !rawPhone) {
      res.status(400);
      throw new Error("🚫 All fields are mandatory!");
    }

    // 🛡️ CodeQL FIX: Sanitize inputs before database queries
    const email = sanitizeEmail(rawEmail);
    const phone = sanitizePhone(rawPhone);

    // --- Scenario A: Check Phone Duplicity FIRST (prevents hijacking) ---
    const phoneExists = await User.findOne({ phone: String(phone) });
    if (phoneExists) {
      res.status(400);
      throw new Error("Phone number already used.");
    }

    const userExists = await User.findOne({ email: String(email) });

    // --- Scenario B: User Exists but Not Verified (Resend OTP) ---
    if (userExists) {
      if (userExists.isVerified) {
        res.status(400);
        throw new Error("User already exists");
      } else {
        // 🛡️ SECURITY FIX: Use cryptographically secure OTP generation
        const otp = crypto.randomInt(100000, 999999).toString();
        userExists.otp = otp;
        userExists.otpExpires = Date.now() + 10 * 60 * 1000;
        userExists.name = name;
        userExists.phone = phone; // Using sanitized phone input
        userExists.password = password;

        await userExists.save();

        try {
          // 📧 Send User Email
          await sendEmail({
            email: userExists.email,
            subject: `🔐 ${otp} is your Verification Code`,
            html: getOtpTemplate(otp),
          });

          return res.status(200).json({
            message: `OTP Resent to Email!`,
            email: userExists.email,
          });
        } catch (e) {
          res.status(500);
          throw new Error("Email sending failed. Please try again.");
        }
      }
    }

    // 🛡️ SECURITY FIX: Use cryptographically secure OTP generation
    const otp = crypto.randomInt(100000, 999999).toString();

    // --- Scenario C: Create New User ---
    const user = await User.create({
      name,
      email,
      password,
      phone, // Using raw phone input
      // 🛡️ SECURITY FIX (SEC-3): Never trust client-provided role — always hardcode to "user"
      role: "user",
      isVerified: false,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
    });

    if (user) {
      try {
        // 📧 Send User Email
        await sendEmail({
          email: user.email,
          subject: `🔐 ${otp} is your Verification Code`,
          html: getOtpTemplate(otp),
        });

        return res.status(201).json({
          message: `OTP sent to Email!`,
          email: user.email,
        });
      } catch (e) {
        // Cleanup if email fails
        await User.findByIdAndDelete(user._id);
        res.status(500);
        throw new Error(
          "Email sending failed. Please check your email address.",
        );
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
export const verifyEmailAPI = async (req, res, next) => {
  try {
    const { email: rawEmail, otp } = req.body;
    // 🛡️ CodeQL FIX: Sanitize email before DB query
    const email = sanitizeEmail(rawEmail);
    const user = await User.findOne({ email: String(email) });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      // 🎉 SUCCESS: Send Welcome Email to User
      // NOTE: Admin alert is handled automatically by userModel.js post-save hook
      try {
        await sendEmail({
          email: user.email,
          subject: "Welcome to the SwadKart Family! 🍕",
          html: getWelcomeTemplate(user.name),
        });
      } catch (emailError) {
        console.error(
          "⚠️ Welcome email failed (Silent):",
          emailError.message,
        );
      }

      generateToken(res, user._id); // Sets Secure HttpOnly Cookie

      // Return full user data (sans password) to prevent Redux data wipe
      const safeUser = user.toObject();
      delete safeUser.password;
      return res.json(safeUser);
    } else {
      res.status(400);
      throw new Error("❌ Invalid or Expired OTP");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
export const loginUser = async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body;
    // 🛡️ CodeQL FIX: Sanitize email before DB query
    const email = sanitizeEmail(rawEmail);
    const user = await User.findOne({ email: String(email) });

    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        res.status(401);
        throw new Error("🚫 Email not verified!");
      }

      generateToken(res, user._id); // Sets Secure HttpOnly Cookie

      // Return full user data (sans password) to prevent Redux data wipe
      const safeUser = user.toObject();
      delete safeUser.password;
      return res.json(safeUser);
    } else {
      res.status(401);
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    // BUG-14 FIX: Enforce minimum wait time between forgot password requests
    // Prevent email bombing/spamming
    const cleanEmail = sanitizeEmail(req.body.email);
    const user = await User.findOne({ email: String(cleanEmail) });
    if (!user) {
      // 🛡️ SECURITY FIX (BUG-11): Generic message prevents user enumeration
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    if (user.resetPasswordExpire && user.resetPasswordExpire > Date.now()) {
      return res.status(429).json({ message: "A reset link was already sent recently. Please check your email or wait." });
    }

    const resetToken = user.getResetPasswordToken();
    // BUG-15 FIX: Validate that token actually got attached before saving
    if (!user.resetPasswordToken || !user.resetPasswordExpire) {
       throw new Error('Failed to generate reset token');
    }

    await user.save({ validateBeforeSave: false });
    const resetUrl = `${
      process.env.FRONTEND_URL || "https://swadkart.vercel.app"
    }/password/reset/${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: "Password Reset",
      html: getResetPasswordTemplate(resetUrl),
    });
    res.json({ message: "Email sent" });
  } catch (e) {
    next(e);
  }
};

// @desc    Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      res.status(400);
      throw new Error("Invalid Token");
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // BUG-14 FIX: Auto-login user after successful password reset
    generateToken(res, user._id);
    res.json({ message: "Password Updated. You are now logged in." });
  } catch (e) {
    next(e);
  }
};

// @desc    Logout user — clear HttpOnly cookie
// @route   POST /api/v1/users/logout
// @access  Public
export const logoutUser = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0), // Expire immediately
  });
  res.status(200).json({ message: "Logged out successfully" });
};
