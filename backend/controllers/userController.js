import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

// =================================================================
// 👤 USER PROFILE OPERATIONS
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
// 🏙️ ADMIN & RESTAURANT OPERATIONS
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

// @desc    Update User by Admin
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

export const getRestaurantById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user) return res.json(user);
    else {
      res.status(404);
      throw new Error("Not found");
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
