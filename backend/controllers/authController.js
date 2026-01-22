import crypto from "crypto";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getOtpTemplate,
  getResetPasswordTemplate,
  getWelcomeTemplate,
} from "../utils/emailTemplates.js";

// @desc    Register user (Sends OTP via Email Only)
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      res.status(400);
      throw new Error("🚫 All fields are mandatory!");
    }

    const userExists = await User.findOne({ email });

    // --- Scenario A: User Exists but Not Verified (Resend OTP) ---
    if (userExists) {
      if (userExists.isVerified) {
        res.status(400);
        throw new Error("User already exists");
      } else {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        userExists.otp = otp;
        userExists.otpExpires = Date.now() + 10 * 60 * 1000;
        userExists.name = name;
        userExists.phone = phone; // Using raw phone input
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

    // --- Scenario B: Check Phone Duplicity ---
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      res.status(400);
      throw new Error("Phone number already used.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // --- Scenario C: Create New User ---
    const user = await User.create({
      name,
      email,
      password,
      phone, // Using raw phone input
      role: role || "user",
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
          "Email sending failed. Please check your email address."
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
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      // ===============================================
      // 🎉 SUCCESS NOTIFICATIONS (User + Admin)
      // ===============================================
      try {
        // 1. User ko Welcome Email
        await sendEmail({
          email: user.email,
          subject: "Welcome to the SwadKart Family! 🍕",
          html: getWelcomeTemplate(user.name),
        });

        // 2. Admin ko Notification Email
        if (process.env.SMTP_MAIL) {
          await sendEmail({
            email: process.env.SMTP_MAIL,
            subject: `🚀 New User Verified: ${user.name}`,
            html: `
               <h2>New Registration Alert</h2>
               <p><strong>Name:</strong> ${user.name}</p>
               <p><strong>Email:</strong> ${user.email}</p>
               <p><strong>Phone:</strong> ${user.phone}</p>
               <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
             `,
          });
          console.log("Admin Notification Sent!");
        }
      } catch (emailError) {
        console.error(
          "⚠️ Notification Logic Failed (Silent):",
          emailError.message
        );
      }

      const token = generateToken(res, user._id);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
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
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        res.status(401);
        throw new Error("🚫 Email not verified!");
      }
      const token = generateToken(res, user._id);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
        token,
      });
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
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    const resetToken = user.getResetPasswordToken();
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
    res.json({ message: "Password Updated" });
  } catch (e) {
    next(e);
  }
};
