import crypto from "crypto";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import {
  getOtpTemplate,
  getWelcomeTemplate,
  getResetPasswordTemplate,
} from "../utils/emailTemplates.js";

// Debug Log
console.log("🟢 RELOADED: User Controller Code Loaded Successfully!");

// =================================================================
// 🔐 AUTHENTICATION & USER PROFILE
// =================================================================

// @desc    Register user (Supports Resend OTP & Professional Emails)
export const registerUser = async (req, res) => {
  console.log("👉 Register Function Hit");
  try {
    const { name, email, password, phone, role } = req.body;

    // 1. Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "🚫 All fields are mandatory!" });
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "🚫 Invalid Phone Number!" });
    }

    // 2. Check Exists & Resend Logic
    const userExists = await User.findOne({ email });

    // 👇 RESEND OTP LOGIC
    if (userExists) {
      if (userExists.isVerified) {
        return res.status(400).json({ message: "User already exists" });
      } else {
        console.log("🔄 User exists but unverified. Resending OTP...");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        // Update User Details
        userExists.otp = otp;
        userExists.otpExpires = otpExpires;
        userExists.name = name;
        userExists.phone = phone;
        userExists.password = password;

        await userExists.save();

        const otpTemplate = getOtpTemplate(otp);

        try {
          await sendEmail({
            email: userExists.email,
            subject: `🔐 ${otp} is your Verification Code`,
            html: otpTemplate,
          });
          return res.status(200).json({
            message: `OTP Resent to ${userExists.email}`,
            email: userExists.email,
          });
        } catch (err) {
          console.error("Resend Email Error:", err.message);
          return res.status(500).json({ message: "Email failed to send." });
        }
      }
    }

    // 3. New User Creation
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || "user",
      isVerified: false,
      otp,
      otpExpires,
    });

    if (user) {
      const otpTemplate = getOtpTemplate(otp);

      try {
        await sendEmail({
          email: user.email,
          subject: `🔐 ${otp} is your Verification Code`,
          html: otpTemplate,
        });

        return res.status(201).json({
          message: `OTP sent to ${user.email}`,
          email: user.email,
        });
      } catch (err) {
        console.error("Email Error:", err.message);
        await User.findByIdAndDelete(user._id);
        return res
          .status(500)
          .json({ message: "Email failed to send. Try again." });
      }
    }
  } catch (error) {
    console.error("Register Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
export const verifyEmailAPI = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      // ✨ Generate Token
      const token = generateToken(user._id);

      // ✨ Set Cookie (Extra Security Layer)
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development", // HTTPS in production
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
      });

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token, // JSON Token
      });
    } else {
      return res.status(400).json({ message: "❌ Invalid or Expired OTP" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        return res.status(401).json({ message: "🚫 Email not verified!" });
      }

      // ✨ Generate Token
      const token = generateToken(user._id);

      // ✨ Set Cookie (Backup Authentication)
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
      });

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
        token: token, // JSON Token
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (user) {
      return res.json(user);
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      if (req.body.password) user.password = req.body.password;

      const updatedUser = await user.save();
      const token = generateToken(updatedUser._id);

      // Update cookie on profile update
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        token: token,
      });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🏙️ ADMIN & RESTAURANT OPERATIONS
// =================================================================

export const getAllRestaurantsPublic = async (req, res) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    return res.json(restaurants);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    return res.json(restaurants);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update User by Admin (Includes Live Shop Re-Ordering)
export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.image = req.body.image || user.image;

      // 👇 Shop Order Index Logic
      if (req.body.orderIndex !== undefined) {
        user.orderIndex = req.body.orderIndex;
      }

      const updatedUser = await user.save();

      // 📡 SOCKET MAGIC: Emit Update Event
      if (req.io) {
        req.io.emit("restaurantUpdated", updatedUser);
        console.log(`📡 Restaurant Updated & Emitted: ${updatedUser.name}`);
      }

      return res.json(updatedUser);
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === "admin") {
        return res.status(400).json({ message: "Cannot delete Admin" });
      }
      await user.deleteOne();
      return res.json({ message: "User removed successfully" });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createRestaurantByAdmin = async (req, res) => {
  try {
    const { name, email, password, image } = req.body;
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
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createDummyRestaurant = async (req, res) => {
  try {
    const { name, image } = req.body;
    const uniqueTime = Date.now();
    const user = await User.create({
      name: name || "New Dummy Shop",
      email: `${(name || "dummy")
        .toLowerCase()
        .replace(/\s+/g, "")}_${uniqueTime}@dummy.swadkart`,
      password: "123",
      role: "restaurant_owner",
      image:
        image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      phone: String(uniqueTime).slice(-10),
      isVerified: true,
      orderIndex: 0,
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) return res.json(user);
    else return res.status(404).json({ message: "Not found" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: "delivery_partner" }).select(
      "-password"
    );
    return res.json(partners);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🔑 PASSWORD RESET
// =================================================================

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${
      process.env.FRONTEND_URL || "https://swadkart-pro.vercel.app"
    }/password/reset/${resetToken}`;

    const resetTemplate = getResetPasswordTemplate(resetUrl);

    await sendEmail({
      email: user.email,
      subject: "SwadKart Password Recovery 🔐",
      html: resetTemplate,
    });
    return res.json({ message: "Reset link sent to email" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
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
      return res.status(400).json({ message: "Invalid Token" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.json({ message: "Password Updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const seedDatabase = async (req, res) => {
  return res.json({ message: "Seed functionality called." });
};
