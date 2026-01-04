import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js"; // 👈 Added Restaurant Model
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import mongoose from "mongoose";

// =================================================================
// 👤 1. USER PROFILE OPERATIONS
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
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      if (req.body.password) user.password = req.body.password;

      const updatedUser = await user.save();
      const token = generateToken(res, updatedUser._id);

      return res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        token: token,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

// =================================================================
// 🏙️ 2. ADMIN & RESTAURANT OPERATIONS
// =================================================================

export const getAllRestaurantsPublic = async (req, res, next) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    return res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

export const getAllRestaurants = async (req, res, next) => {
  try {
    const restaurants = await User.find({ role: "restaurant_owner" })
      .select("-password")
      .sort({ orderIndex: 1 });
    return res.json(restaurants);
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

      if (req.body.orderIndex !== undefined) {
        user.orderIndex = req.body.orderIndex;
      }

      const updatedUser = await user.save();

      if (req.io) {
        req.io.emit("restaurantUpdated", updatedUser);
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

      // ✅ Also delete the associated restaurant profile
      await Restaurant.findOneAndDelete({ owner: user._id });
      await user.deleteOne();

      return res.json({ message: "Merchant and Shop Profile removed" });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

// ✅ FIX: Admin: Add new restaurant partner (User + Restaurant Entry)
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
      // 2. 🔥 Create Restaurant Profile (Important!)
      await Restaurant.create({
        name: `${name} (Shop)`,
        owner: user._id,
        image: user.image,
        address: "Default Address, India",
        isVerified: false, // Authorize button click will make it true
        isActive: true,
      });
    }

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// ✅ FIX: Admin: Create dummy shop (User + Restaurant Entry)
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
      password: "123",
      role: "restaurant_owner",
      image:
        image || "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      phone: String(uniqueTime).slice(-10),
      isVerified: true,
      orderIndex: 0,
    });

    if (user) {
      // 2. 🔥 Create Synthetic Restaurant Profile
      await Restaurant.create({
        name: `${user.name} (Shop)`,
        owner: user._id,
        image: user.image,
        address: "Synthetic Street, Cyber City",
        isVerified: false,
        isDummy: true, // Flag for dummy data
        isActive: true,
      });
    }

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const getRestaurantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error("Invalid ID format");
    }

    const user = await User.findById(id).select("-password");
    if (user) return res.json(user);
    else {
      res.status(404);
      throw new Error("Restaurant not found");
    }
  } catch (error) {
    next(error);
  }
};

export const getDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: "delivery_partner" }).select(
      "-password"
    );
    return res.json(partners);
  } catch (error) {
    next(error);
  }
};

export const seedDatabase = async (req, res, next) => {
  return res.json({ message: "Seed functionality called." });
};

// ==========================================
// 📧 3. NEWSLETTER SUBSCRIPTION
// ==========================================
export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    await sendEmail({
      email: process.env.SMTP_MAIL || "swadkartt@gmail.com",
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
    return res.status(500).json({ message: "Subscription failed." });
  }
};
