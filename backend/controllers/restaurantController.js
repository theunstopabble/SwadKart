import Restaurant from "../models/restaurantModel.js";

// ==========================================
// 🛠️ HELPER: Check if Store is Open
// ==========================================
const checkIsOpen = (openTime, closeTime) => {
  if (!openTime || !closeTime) return true; // Default open if no time set

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = openTime.split(":").map(Number);
  const startMinutes = openH * 60 + openM;

  const [closeH, closeM] = closeTime.split(":").map(Number);
  const endMinutes = closeH * 60 + closeM;

  // Case 1: Same day (e.g., 10:00 to 22:00)
  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Case 2: Overnight (e.g., 22:00 to 02:00)
  else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

// ==========================================
// 🏠 1. GET ALL RESTAURANTS (Public)
// ==========================================
// @desc    Get all active/verified restaurants for users
// @route   GET /api/v1/restaurants
const getRestaurants = async (req, res) => {
  try {
    // Show only Verified OR Dummy restaurants to public
    const restaurants = await Restaurant.find({
      $or: [{ isVerified: true }, { isDummy: true }],
    }).sort({ createdAt: -1 });

    // ✨ Compute 'isOpenNow' dynamically
    const updatedRestaurants = restaurants.map((rest) => {
      const isOpen = checkIsOpen(rest.openingTime, rest.closingTime);
      return { ...rest._doc, isOpenNow: isOpen };
    });

    res.json(updatedRestaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 2. GET ALL SHOPS FOR ADMIN (The Missing Link)
// ==========================================
// @desc    Get ALL restaurants (Verified + Pending) for Admin Dashboard
// @route   GET /api/v1/restaurants/admin/all
const getAllRestaurantsAdmin = async (req, res) => {
  try {
    // Hamein saare restaurants chahiye (active, pending, dummy sab)
    const restaurants = await Restaurant.find({})
      .populate("owner", "name email") // Owner ki details bhi le lo
      .sort({ createdAt: -1 });

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🏢 3. GET SINGLE RESTAURANT
// ==========================================
// @route   GET /api/v1/restaurants/:id
const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (restaurant) {
      const isOpen = checkIsOpen(
        restaurant.openingTime,
        restaurant.closingTime
      );
      res.json({ ...restaurant._doc, isOpenNow: isOpen });
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
// @route   GET /api/v1/restaurants/top
const getTopRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isVerified: true })
      .sort({ rating: -1 })
      .limit(3);
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ➕ 5. CREATE RESTAURANT (Seller)
// ==========================================
// @route   POST /api/v1/restaurants
const createRestaurant = async (req, res) => {
  try {
    const { name, address, image, description } = req.body;

    const restaurantExists = await Restaurant.findOne({ name });
    if (restaurantExists) {
      return res.status(400).json({ message: "Restaurant name already taken" });
    }

    const restaurant = new Restaurant({
      owner: req.user._id,
      name,
      address,
      image,
      description,
      isVerified: false, // Always false initially
    });

    const createdRestaurant = await restaurant.save();
    res.status(201).json(createdRestaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🛍️ 6. GET OWNER'S RESTAURANT (Dashboard)
// ==========================================
// @route   GET /api/v1/restaurants/mine
const getOwnerRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (restaurant) {
      res.json(restaurant);
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
// @route   PUT /api/v1/restaurants/settings
const updateRestaurantSettings = async (req, res) => {
  const { openingTime, closingTime, name, description, address, image } =
    req.body;

  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (restaurant) {
      // Update Timings
      if (openingTime) restaurant.openingTime = openingTime;
      if (closingTime) restaurant.closingTime = closingTime;

      // Update Profile Info
      if (name) restaurant.name = name;
      if (description) restaurant.description = description;
      if (address) restaurant.address = address;
      if (image) restaurant.image = image;

      const updatedRestaurant = await restaurant.save();
      res.json(updatedRestaurant);
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👮 8. ADMIN VERIFY / AUTHORIZE (With Socket & ID Fix)
// ==========================================
// @route   PUT /api/v1/restaurants/:id/approve
const verifyRestaurant = async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Find by ID or Owner ID (Dono check karo)
    let restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ owner: id });
    }

    if (restaurant) {
      restaurant.isVerified = !restaurant.isVerified;
      if (restaurant.isVerified) {
        restaurant.isActive = true;
      }

      const updatedRestaurant = await restaurant.save();

      // 🔥 REAL-TIME UPDATE TRIGGER (Socket)
      if (req.io) {
        req.io.emit("shopStatusUpdated", updatedRestaurant);
        req.io.emit("restaurantUpdated", updatedRestaurant);
      }

      res.json({
        message: restaurant.isVerified
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
// @route   POST /api/v1/restaurants/:id/reviews
const createRestaurantReview = async (req, res) => {
  const { rating, comment } = req.body;

  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (restaurant) {
      const alreadyReviewed = restaurant.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res
          .status(400)
          .json({ message: "You already reviewed this place" });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      restaurant.reviews.push(review);

      // Recalculate Rating
      restaurant.numReviews = restaurant.reviews.length;
      restaurant.rating =
        restaurant.reviews.reduce((acc, item) => item.rating + acc, 0) /
        restaurant.reviews.length;

      await restaurant.save();
      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Placeholder if needed for routes compatibility
const updateRestaurantProfile = updateRestaurantSettings;

// ==========================================
// 📤 EXPORTS
// ==========================================
export {
  getRestaurants,
  getRestaurantById,
  getTopRestaurants,
  getAllRestaurantsAdmin, // 👈 Ye naya wala zaroori hai Dashboard ke liye
  createRestaurant,
  getOwnerRestaurant,
  updateRestaurantSettings,
  updateRestaurantProfile,
  verifyRestaurant,
  createRestaurantReview,
};
