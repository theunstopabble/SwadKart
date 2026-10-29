import prisma from "../config/prisma.js";
import { sanitizeString } from "../utils/sanitize.js";

// ==========================================
// 🛠️ HELPER: Check if Store is Open
// ==========================================
const checkIsOpen = (openTime, closeTime) => {
  if (!openTime || !closeTime) return true;

  const now = new Date();
  const IST_OFFSET_MINUTES = 5 * 60 + 30; // UTC + 5:30
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const currentMinutes = (utcMinutes + IST_OFFSET_MINUTES) % (24 * 60);

  const [openH, openM] = openTime.split(":").map(Number);
  const startMinutes = openH * 60 + openM;

  const [closeH, closeM] = closeTime.split(":").map(Number);
  const endMinutes = closeH * 60 + closeM;

  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

// ==========================================
// 🏠 1. GET ALL RESTAURANTS (Public)
// ==========================================
const getRestaurants = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const total = await prisma.restaurant.count({ where: { isVerified: true } });
    const restaurants = await prisma.restaurant.findMany({
      where: { isVerified: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const updatedRestaurants = restaurants.map((rest) => ({
      ...rest,
      isOpenNow: checkIsOpen(rest.openingTime, rest.closingTime),
    }));

    res.json({
      restaurants: updatedRestaurants,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 2. GET ALL SHOPS FOR ADMIN
// ==========================================
const getAllRestaurantsAdmin = async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🏢 3. GET SINGLE RESTAURANT
// ==========================================
const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        reviews: true,
      },
    });

    if (restaurant) {
      const isOpen = checkIsOpen(restaurant.openingTime, restaurant.closingTime);
      res.json({ ...restaurant, isOpenNow: isOpen });
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ⭐ 4. GET TOP RESTAURANTS
// ==========================================
const getTopRestaurants = async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isVerified: true },
      orderBy: { rating: "desc" },
      take: 3,
    });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ➕ 5. CREATE RESTAURANT (Seller)
// ==========================================
const createRestaurant = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const rawName = req.body.name;
    const name = sanitizeString(rawName);
    const { address, image, description } = req.body;

    const restaurantExists = await prisma.restaurant.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (restaurantExists) {
      return res.status(400).json({ message: "Restaurant name already taken" });
    }

    const createdRestaurant = await prisma.restaurant.create({
      data: {
        ownerId: userId,
        name,
        address: address || "",
        image: image || "https://placehold.co/600x400/png?text=Restaurant",
        description: description || "",
        isVerified: false,
      },
    });

    res.status(201).json(createdRestaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🛍️ 6. GET OWNER'S RESTAURANT (Dashboard)
// ==========================================
const getOwnerRestaurant = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
    });

    if (restaurant) {
      const isOpen = checkIsOpen(restaurant.openingTime, restaurant.closingTime);
      res.json({ ...restaurant, isOpenNow: isOpen });
    } else {
      res.status(404).json({ message: "No restaurant found for this owner" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ⚙️ 7. UPDATE SETTINGS (Timings/Profile)
// ==========================================
const updateRestaurantSettings = async (req, res) => {
  const { openingTime, closingTime, name, description, address, image } = req.body;
  const userId = req.user.id || req.user._id;

  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: userId },
    });

    if (restaurant) {
      const updateData = {};
      if (openingTime) updateData.openingTime = openingTime;
      if (closingTime) updateData.closingTime = closingTime;
      if (name) updateData.name = sanitizeString(name);
      if (description) updateData.description = sanitizeString(description);
      if (address) updateData.address = sanitizeString(address);
      if (image) updateData.image = image;

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: updateData,
      });
      res.json(updatedRestaurant);
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👮 8. ADMIN VERIFY / AUTHORIZE
// ==========================================
const verifyRestaurant = async (req, res) => {
  try {
    const id = req.params.id;

    let restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({ where: { ownerId: id } });
    }

    if (restaurant) {
      const nextVerified = !restaurant.isVerified;
      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          isVerified: nextVerified,
          isActive: nextVerified ? true : restaurant.isActive,
        },
      });

      if (req.io) {
        req.io.emit("shopStatusUpdated", updatedRestaurant);
        req.io.emit("restaurantUpdated", updatedRestaurant);
      }

      res.json({
        message: updatedRestaurant.isVerified
          ? "Restaurant Authorized ✅"
          : "Authorization Revoked ❌",
        restaurant: updatedRestaurant,
      });
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================
// 💬 9. CREATE REVIEW
// ==========================================
const createRestaurantReview = async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user.id || req.user._id;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: { reviews: true },
    });

    if (restaurant) {
      const alreadyReviewed = restaurant.reviews.find((r) => r.userId === userId);
      if (alreadyReviewed) {
        return res.status(400).json({ message: "You already reviewed this place" });
      }

      await prisma.review.create({
        data: {
          name: req.user.name,
          rating: Number(rating),
          comment,
          userId,
          restaurantId: restaurant.id,
        },
      });

      const allReviews = await prisma.review.findMany({
        where: { restaurantId: restaurant.id },
      });
      const avgRating =
        allReviews.reduce((acc, item) => item.rating + acc, 0) / allReviews.length;

      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          numReviews: allReviews.length,
          rating: avgRating,
        },
      });

      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateRestaurantProfile = updateRestaurantSettings;

export {
  getRestaurants,
  getRestaurantById,
  getTopRestaurants,
  getAllRestaurantsAdmin,
  createRestaurant,
  getOwnerRestaurant,
  updateRestaurantSettings,
  updateRestaurantProfile,
  verifyRestaurant,
  createRestaurantReview,
};
