import crypto from "crypto";
import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";
import {
  hashPassword,
  matchPassword as verifyPassword,
  generateResetToken,
  generateReferralCode,
} from "../utils/password.js";
import {
  getOtpTemplate,
  getResetPasswordTemplate,
  getWelcomeTemplate,
} from "../utils/emailTemplates.js";
import { applyReferralOnRegister } from "../controllers/referralController.js";

// @desc    Register user (Sends OTP via Email Only)
export const registerUser = async (req, res, next) => {
  try {
    const { name, email: rawEmail, password, phone: rawPhone, referralCode } = req.body;

    if (!name || !rawEmail || !password || !rawPhone) {
      res.status(400);
      throw new Error("🚫 All fields are mandatory!");
    }

    const email = sanitizeEmail(rawEmail);
    const phone = sanitizePhone(rawPhone);

    if (password !== req.body.confirmPassword) {
      res.status(400);
      throw new Error("Passwords do not match.");
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(String(phone))) {
      res.status(400);
      throw new Error("Invalid Indian phone number.");
    }

    // Check Phone Duplicity
    const userExists = await prisma.user.findUnique({ where: { email: String(email) } });
    const phoneExists = await prisma.user.findFirst({ where: { phone: String(phone) } });
    if (phoneExists && (phoneExists.isVerified || (userExists && phoneExists.id !== userExists.id))) {
      res.status(400);
      throw new Error("Phone number already used.");
    }

    // User Exists but Not Verified (Resend OTP)
    if (userExists) {
      if (userExists.isVerified) {
        res.status(400);
        throw new Error("User already exists");
      } else {
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedPassword = await hashPassword(password);

        await prisma.user.update({
          where: { id: userExists.id },
          data: {
            otp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000),
            name,
            phone,
            password: hashedPassword,
          },
        });

        try {
          await sendEmail({
            email: userExists.email,
            subject: "Your SwadKart Verification Code",
            html: getOtpTemplate(otp),
          });

          return res.status(200).json({
            message: `OTP Resent to Email!`,
            email: userExists.email,
          });
        } catch {
          res.status(500);
          throw new Error("Email sending failed. Please try again.");
        }
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await hashPassword(password);
    const myReferralCode = generateReferralCode();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: "user",
        isVerified: false,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        referralCode: myReferralCode,
        pendingReferralCode: referralCode ? referralCode.toUpperCase() : null,
      },
    });

    if (user) {
      try {
        await sendEmail({
          email: user.email,
          subject: `${otp} is your Verification Code`,
          html: getOtpTemplate(otp),
        });

        return res.status(201).json({
          message: `OTP sent to Email!`,
          email: user.email,
        });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`⚠️ Email sending skipped in dev mode. Auto-verifying user: ${user.email} (OTP was: ${otp})`);
          await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true, otp: null, otpExpires: null },
          });
          return res.status(201).json({
            message: `User created and auto-verified for development! You can log in now.`,
            email: user.email,
            autoVerified: true,
          });
        }
        await prisma.user.delete({ where: { id: user.id } });
        res.status(500);
        throw new Error("Email sending failed. Please check your email address.");
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
    const email = sanitizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email: String(email) } });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.otpExpires && new Date(user.otpExpires) < new Date()) {
      res.status(400);
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (user.otp !== otp) {
      res.status(400);
      throw new Error("Invalid OTP.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otp: null,
        otpExpires: null,
      },
    });

    try {
      await sendEmail({
        email: updatedUser.email,
        subject: "Welcome to the SwadKart Family!",
        html: getWelcomeTemplate(updatedUser.name),
      });
    } catch (emailError) {
      console.error("⚠️ Welcome email failed (Silent):", emailError.message);
    }

    const token = generateToken(res, updatedUser.id, updatedUser.tokenVersion);

    try {
      if (updatedUser.pendingReferralCode) {
        await applyReferralOnRegister(updatedUser.id, updatedUser.pendingReferralCode);
        await prisma.user.update({
          where: { id: updatedUser.id },
          data: { pendingReferralCode: null },
        });
      }
    } catch (refErr) {
      console.error("🔗 Referral processing error (non-blocking):", refErr.message);
    }

    const { password: _, ...safeUser } = updatedUser;
    safeUser.token = token;
    return res.json(safeUser);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
export const loginUser = async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = sanitizeEmail(rawEmail);
    console.log("👉 Login attempt for email:", email);
    const user = await prisma.user.findUnique({ where: { email: String(email) } });

    if (user && (await verifyPassword(password, user.password))) {
      if (!user.isVerified) {
        res.status(401);
        throw new Error("🚫 Email not verified!");
      }

      const token = generateToken(res, user.id, user.tokenVersion);
      const { password: _, ...safeUser } = user;
      safeUser.token = token;
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
    const cleanEmail = sanitizeEmail(req.body.email);
    const user = await prisma.user.findUnique({ where: { email: String(cleanEmail) } });
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    if (user.resetPasswordExpire && (new Date(user.resetPasswordExpire).getTime() - Date.now() > 9 * 60 * 1000)) {
      return res.status(429).json({ message: "A reset link was already sent recently. Please check your email or wait 1 minute." });
    }

    const { resetToken, resetPasswordToken, resetPasswordExpire } = generateResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExpire },
    });

    const resetUrl = `${
      process.env.FRONTEND_URL || "https://swadkart.vercel.app"
    }/password/reset/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset",
        html: getResetPasswordTemplate(resetUrl),
      });
    } catch (emailErr) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: null, resetPasswordExpire: null },
      });
      throw emailErr;
    }
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

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400);
      throw new Error("Invalid Token");
    }
    if (!req.body.password || req.body.password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    if (req.body.confirmPassword && req.body.password !== req.body.confirmPassword) {
      res.status(400);
      throw new Error("Passwords do not match");
    }

    const hashedPassword = await hashPassword(req.body.password);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
        tokenVersion: { increment: 1 },
      },
    });

    const token = generateToken(res, updatedUser.id, updatedUser.tokenVersion);
    const { password: _, ...safeUser } = updatedUser;
    safeUser.token = token;
    res.json(safeUser);
  } catch (e) {
    next(e);
  }
};

// @desc    Resend OTP for email verification
export const resendOTP = async (req, res, next) => {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) {
      res.status(400);
      throw new Error("Email is required");
    }
    const email = sanitizeEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified. Please login." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      email: user.email,
      subject: "Your SwadKart Verification Code",
      html: getOtpTemplate(otp),
    });

    res.status(200).json({ message: "OTP resent to email!" });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user — clear HttpOnly cookie
export const logoutUser = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};
