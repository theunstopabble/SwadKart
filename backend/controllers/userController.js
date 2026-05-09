import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
import Notification from "../models/notificationModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";

// =================================================================
// 👤 1. USER PROFILE OPERATIONS (Self)
// =================================================================

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (user) {
      return res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // BUG-07 FIX: Email change requires re-registration — block silent email update
      if (req.body.email && req.body.email !== user.email) {
        return res.status(400).json({
          message: 'Email cannot be changed directly. Please contact support or re-register.',
        });
      }

      user.name = req.body.name || user.name;
      user.email = sanitizeEmail(req.body.email) || user.email;
      if (req.body.phone) {
        const cleanPhone = sanitizePhone(req.body.phone);
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(String(cleanPhone))) {
          res.status(400);
          throw new Error("Invalid Indian phone number.");
        }
        user.phone = cleanPhone;
      }
      if (req.body.password) {
        if (req.body.password.length < 6) {
          res.status(400);
          throw new Error("Password must be at least 6 characters.");
        }
        user.password = req.body.password;
      }
      if (req.body.description !== undefined) {
        user.description = req.body.description;
      }
      const updatedUser = await user.save();
      generateToken(res, updatedUser._id); // Refreshes HttpOnly cookie

      const safeData = updatedUser.toObject();
      delete safeData.password;

      return res.json(safeData);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 🔐 BIOMETRIC STATUS (Industry Standard Sync)
// =================================================================

// @desc    Update biometric enabled status
// @route   PUT /api/v1/users/profile/biometric-status
// @access  Private
export const updateBiometricStatus = async (req, res, next) => {
  try {
    const { isEnabled } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.isBiometricEnabled = isEnabled;

    // 🧹 CLEANUP: When disabling, also clear old credentials
    // This ensures fresh registration next time and prevents stale credential issues
    if (!isEnabled) {
      user.biometricCredentials = [];
      user.currentChallenge = "";
    }

    await user.save();

    return res.json({
      success: true,
      isBiometricEnabled: user.isBiometricEnabled,
      message: isEnabled
        ? "Biometric Enabled ✅"
        : "Biometric Disabled & Credentials Cleared 🔒",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get biometric status (for auto-restore after login)
// @route   GET /api/v1/users/profile/biometric-status
// @access  Private
export const getBiometricStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Check if user has registered any biometric credentials
    const hasCredentials =
      user.biometricCredentials && user.biometricCredentials.length > 0;

    return res.json({
      isBiometricEnabled: user.isBiometricEnabled,
      hasCredentials: hasCredentials,
    });
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 👑 2. ADMIN OPERATIONS (Manage All Users)
// =================================================================

// ✅ CRITICAL FIX: Fetch ALL users (Users, Delivery, Owners) for Admin Panel
export const getUsers = async (req, res, next) => {
  try {
    // 🚀 PERFORMANCE FIX: Extracted Page & Limit
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const count = await User.countDocuments({});

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: users,
      metadata: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.image = req.body.image || user.image;

      // ✅ FIX: Allow admin to update User Role
      if (req.body.role) {
        user.role = req.body.role;
      }

      if (req.body.orderIndex !== undefined) {
        user.orderIndex = req.body.orderIndex;
      }

      const updatedUser = await user.save();

      if (req.io) {
        req.io.to(updatedUser._id.toString()).emit("userUpdated", updatedUser);
      }

      return res.json(updatedUser);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === "admin") {
        res.status(400);
        throw new Error("Cannot delete Admin");
      }

      // Also delete the associated restaurant profile if it exists
      await Restaurant.findOneAndDelete({ owner: user._id });
      // 🛡️ GDPR FIX: Cascade delete related user data
      await Order.deleteMany({ user: user._id });
      await Product.deleteMany({ user: user._id });
      await Notification.deleteMany({ user: user._id });
      await CouponUsage.deleteMany({ user: user._id });
      await user.deleteOne();

      return res.json({ message: "User identity and associated data removed" });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 🏙️ 3. RESTAURANT & DELIVERY OPERATIONS
// =================================================================

export const getAllRestaurantsPublic = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .select("name image description rating numReviews address isOpenNow openingTime closingTime")
      .sort({ orderIndex: 1 });
    return res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

export const createRestaurantByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, image } = req.body;

    // 1. Create User Identity
    const user = await User.create({
      name,
      email,
      password,
      role: "restaurant_owner",
      image:
        image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      isVerified: true,
      orderIndex: 0,
    });

    if (user) {
      // 2. Create Restaurant Profile
      await Restaurant.create({
        name: `${name} (Shop)`,
        owner: user._id,
        image: user.image,
        address: "Default Address, India",
        description: "Restaurant managed by SwadKart admin.",
        isVerified: true,
        isActive: true,
      });
    }

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const createDummyRestaurant = async (req, res, next) => {
  try {
    const { name, image } = req.body;
    const uniqueTime = Date.now();

    // 1. Create Synthetic User Identity
    const user = await User.create({
      name: name || "New Dummy Shop",
      email: `${(name || "dummy")
        .toLowerCase()
        .replace(/\s+/g, "")}_${uniqueTime}@dummy.swadkart`,
      password: `Dummy@${uniqueTime}`,
      role: "restaurant_owner",
      image:
        image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      phone: String(uniqueTime).slice(-10),
      isVerified: true,
      orderIndex: 0,
    });

    if (user) {
      // 2. Create Synthetic Restaurant Profile
      await Restaurant.create({
        name: `${user.name} (Shop)`,
        owner: user._id,
        image: user.image,
        address: "Synthetic Street, Cyber City",
        description: "Synthetic restaurant for demo purposes.",
        isVerified: false,
        isDummy: true,
        isActive: true,
      });
    }

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const getDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: "delivery_partner" }).select(
      "-password",
    );
    return res.json(partners);
  } catch (error) {
    next(error);
  }
};

export const seedDatabase = async (req, res, next) => {
  return res.json({ message: "Seed functionality called." });
};

// =================================================================
// 📧 4. NEWSLETTER & GOOGLE AUTH
// =================================================================

export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // 🛠️ FIX: Hardcoded email hata diya. Ab ye sirf Environment Variable use karega.
    const adminEmail = process.env.SMTP_MAIL;

    if (!adminEmail) {
      console.warn("⚠️ Admin email (SMTP_MAIL) not set in .env");
      // Agar backend me email set nahi hai, to client ko success dikhao par log kar lo
      return res
        .status(200)
        .json({ message: "Success! You are now subscribed. 🚀" });
    }

    // Notify Admin safely
    await sendEmail({
      email: adminEmail, // ✅ Only uses .env variable now
      subject: "🔔 New Newsletter Subscriber!",
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; max-width: 600px; background-color: #f9f9f9;">
          <h2 style="color: #ef4444;">New Subscriber Alert! 🚀</h2>
          <p>Hi Admin, a new user subscribed to the SwadKart newsletter.</p>
          <div style="background: #fff; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; font-weight: bold;">
              Email: <a href="mailto:${email}" style="color: #ef4444;">${email}</a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">Sent by SwadKart Automated System.</p>
        </div>
      `,
    });

    return res
      .status(200)
      .json({ message: "Success! You are now subscribed. 🚀" });
  } catch (error) {
    console.error("Newsletter Error:", error.message);
    return res
      .status(200)
      .json({ message: "Success! You are now subscribed. 🚀" });
  }
};

// Google Auth Logic
export const googleCheck = async (req, res, next) => {
  try {
    const rawEmail = req.body.email;
    const email = sanitizeEmail(rawEmail);
    const user = await User.findOne({ email: String(email) });

    if (user) {
      generateToken(res, user._id); // Sets HttpOnly Cookie

      // 🛡️ SECURITY FIX: Sanitize user object, strictly remove password and omit token
      const userSafeData = user.toObject();
      delete userSafeData.password;

      return res.json({ exists: true, user: userSafeData });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    next(error);
  }
};

export const googleRegister = async (req, res, next) => {
  try {
    const { name, email: rawEmail, image, phone: rawPhone } = req.body;
    const email = sanitizeEmail(rawEmail);

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(String(rawPhone))) {
      return res.status(400).json({ message: "Invalid Indian phone number." });
    }

    const phone = sanitizePhone(rawPhone);
    const phoneExists = await User.findOne({ phone: String(phone) });
    if (phoneExists) {
      res.status(400);
      throw new Error("Phone number is already associated with another account");
    }

    const emailExists = await User.findOne({ email: String(email) });
    if (emailExists) {
      res.status(400);
      throw new Error("Email is already registered. Please login instead.");
    }

    const user = await User.create({
      name,
      email: String(email),
      phone,
      image,
      password: crypto.randomBytes(32).toString("hex"),
      isVerified: true,
    });

    if (user) {
      generateToken(res, user._id);
      const safeUser = user.toObject();
      delete safeUser.password;
      return res.status(201).json(safeUser);
    }
  } catch (error) {
    next(error);
  }
};
