import crypto from "crypto";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";

// ==========================================
// 🎨 SHARED EMAIL STYLES (Site Theme)
// ==========================================
const emailStyles = `
  <style>
    body { font-family: 'Arial', sans-serif; background-color: #000000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background-color: #000000; padding: 35px; text-align: center; border-bottom: 1px solid #1f2937; }
    .logo-text { font-size: 38px; font-weight: 800; margin: 0; letter-spacing: -1.5px; }
    .swad { color: #ff4757; } 
    .kart { color: #ffffff; }
    .content { padding: 40px; color: #d1d5db; line-height: 1.8; text-align: center; }
    .otp-box { background-color: #000000; color: #ff4757; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px dashed #ff4757; display: inline-block; width: 75%; }
    .cta-button { display: inline-block; background-color: #ff4757; color: #ffffff !important; text-decoration: none; padding: 14px 35px; border-radius: 12px; font-weight: bold; font-size: 18px; margin-top: 25px; transition: 0.3s; }
    .footer { background-color: #000000; color: #6b7280; text-align: center; padding: 25px; font-size: 12px; border-top: 1px solid #1f2937; }
  </style>
`;

// =================================================================
// 🔐 AUTHENTICATION & USER PROFILE
// =================================================================

// @desc    Register a new user & Send OTP
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "🚫 All fields are mandatory!" });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "🚫 Invalid Phone Number!" });
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "🚫 Only official Gmail accounts allowed." });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

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
      const otpTemplate = `<html><head>${emailStyles}</head><body><div class="container"><div class="header"><h1 class="logo-text"><span class="swad">Swad</span><span class="kart">Kart</span></h1></div><div class="content"><h2>Verify Your Email</h2><p>Hi ${
        user.name
      }, use the code below to verify your account.</p><div class="otp-box">${otp}</div></div><div class="footer"><p>&copy; ${new Date().getFullYear()} SwadKart.</p></div></div></body></html>`;

      try {
        await sendEmail({
          email: user.email,
          subject: `🔐 ${otp} is your SwadKart Verification Code`,
          html: otpTemplate,
        });
        res
          .status(201)
          .json({ message: `OTP sent to ${user.email}`, email: user.email });
      } catch (err) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ message: "Email failed to send." });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP & Activate Account
export const verifyEmailAPI = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "❌ Invalid or Expired OTP" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified)
        return res.status(401).json({ message: "🚫 Email not verified!" });
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) res.json(user);
    else res.status(404).json({ message: "User not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      if (req.body.password) user.password = req.body.password;
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        token: generateToken(updatedUser._id),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🏙️ ADMIN & RESTAURANT (INDEXING & DELETE)
// =================================================================

// @desc    Get all restaurants Public (Sorted by orderIndex)
export const getAllRestaurantsPublic = async (req, res) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all restaurants Admin (Sorted by orderIndex)
export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Restaurant by ID
export const getRestaurantById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) res.json(user);
    else res.status(404).json({ message: "Not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Shop/Restaurant Profile by Admin (Handles Reordering)
export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.image = req.body.image || user.image;

      // 👈 orderIndex logic for reordering
      if (req.body.orderIndex !== undefined) {
        user.orderIndex = req.body.orderIndex;
      }

      const updated = await user.save();
      res.json(updated);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Restaurant/User by Admin
export const deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === "admin")
        return res.status(400).json({ message: "Cannot delete Admin" });
      await user.deleteOne();
      res.json({ message: "Restaurant removed successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Restaurant by Admin
export const createRestaurantByAdmin = async (req, res) => {
  try {
    const { name, email, password, image } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      role: "restaurant_owner",
      image,
      isVerified: true,
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Dummy Restaurant
export const createDummyRestaurant = async (req, res) => {
  try {
    const { name, image } = req.body;
    const user = await User.create({
      name,
      email: `${Date.now()}@dummy.com`,
      password: "123",
      role: "restaurant_owner",
      image,
      phone: "0000000000",
      isVerified: true,
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Delivery Partners
export const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: "delivery_partner" }).select(
      "-password"
    );
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 🔑 PASSWORD RESET (Forgot/Reset)
// =================================================================

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${
      process.env.FRONTEND_URL || "https://swadkart-pro.vercel.app"
    }/password/reset/${resetToken}`;
    const resetTemplate = `<html><head>${emailStyles}</head><body><div class="container"><div class="header"><h1 class="logo-text"><span class="swad">Swad</span><span class="kart">Kart</span></h1></div><div class="content"><h2>Password Recovery</h2><p>Click below to reset password.</p><a href="${resetUrl}" class="cta-button">Reset Password</a></div></div></body></html>`;

    await sendEmail({
      email: user.email,
      subject: "SwadKart Password Recovery 🔐",
      html: resetTemplate,
    });
    res.json({ message: "Reset link sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    if (!user) return res.status(400).json({ message: "Invalid Token" });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ message: "Password Updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
