import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";

// =================================================================
// 👤 1. USER PROFILE OPERATIONS
// =================================================================

// @desc    Get profile
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

// @desc    Update profile
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

// @desc    Get all restaurants for public view
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

// @desc    Get all restaurants (Admin)
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

// @desc    Update Restaurant/User by Admin
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

// @desc    Delete User/Restaurant
export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === "admin") {
        res.status(400);
        throw new Error("Cannot delete Admin");
      }
      await user.deleteOne();
      return res.json({ message: "User removed successfully" });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Add new restaurant partner
export const createRestaurantByAdmin = async (req, res, next) => {
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
    next(error);
  }
};

// @desc    Admin: Create dummy shop for testing
export const createDummyRestaurant = async (req, res, next) => {
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
    next(error);
  }
};

// @desc    Get specific restaurant detail
export const getRestaurantById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) return res.json(user);
    else {
      res.status(404);
      throw new Error("Restaurant not found");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery fleet list
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
// 📧 3. NEWSLETTER SUBSCRIPTION (FIXED)
// ==========================================
// @desc    Handle newsletter signups & notify admin via Brevo
export const subscribeToNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    console.log(`📨 Newsletter request for: ${email}`);

    // Admin ko email bhejo (Using Brevo Utility)
    await sendEmail({
      email: process.env.SMTP_MAIL || "swadkartt@gmail.com", // Admin email
      subject: "🔔 New Newsletter Subscriber!",
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #ef4444; text-transform: uppercase;">New Subscriber Alert! 🚀</h2>
          <p>Hi Admin,</p>
          <p>Good news! A new user wants to stay updated with SwadKart.</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-weight: bold;">
             Email: <a href="mailto:${email}" style="color: #ef4444;">${email}</a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">
            Sent automatically by SwadKart System.
          </p>
        </div>
      `,
    });

    res.status(200).json({ message: "Success! You are now subscribed. 🚀" });
  } catch (error) {
    console.error("Newsletter Controller Error:", error.message);
    res
      .status(500)
      .json({ message: "Subscription failed. Please check backend logs." });
  }
};
