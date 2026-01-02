import Restaurant from "../models/restaurantModel.js";

// ==========================================
// 🏠 1. GET RESTAURANTS (Public - Home Page)
// ==========================================
// @desc    Get all active/verified restaurants for users
// @route   GET /api/v1/restaurants
export const getRestaurants = async (req, res) => {
  try {
    // Logic: Home page par sirf Verified ya Dummy restaurants dikhao
    const restaurants = await Restaurant.find({
      $or: [{ isVerified: true }, { isDummy: true }],
    }).sort({ createdAt: -1 });

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 👑 2. GET ALL RESTAURANTS (Admin Only)
// ==========================================
// @desc    Get all restaurants (Pending + Verified + Dummy)
// @route   GET /api/v1/restaurants/admin/all
export const getAllRestaurantsAdmin = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({})
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ✅ 3. APPROVE RESTAURANT (Admin Action)
// ==========================================
// @desc    Verify/Approve a pending restaurant
// @route   PUT /api/v1/restaurants/:id/approve
export const approveRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (restaurant) {
      restaurant.isVerified = true;
      restaurant.isActive = true; // Approve hote hi active bhi kar do

      const updatedRestaurant = await restaurant.save();
      res.json({
        message: "Restaurant Approved & Live! 🍕",
        restaurant: updatedRestaurant,
      });
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🏢 4. GET SINGLE RESTAURANT DETAILS
// ==========================================
// @desc    Get restaurant by ID
// @route   GET /api/v1/restaurants/:id
export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "owner",
      "name"
    );

    if (restaurant) {
      res.json(restaurant);
    } else {
      res.status(404).json({ message: "Restaurant not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
