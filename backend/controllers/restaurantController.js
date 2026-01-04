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

  // Case 1: Same day (10:00 to 22:00)
  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } 
  // Case 2: Overnight (22:00 to 02:00)
  else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

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

    // ✨ Compute 'isOpenNow' dynamically for frontend
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
// ⚙️ UPDATE STORE TIMINGS (Owner Action)
// ==========================================
// @route   PUT /api/v1/restaurants/settings
export const updateStoreSettings = async (req, res) => {
  const { openingTime, closingTime } = req.body;
  
  try {
    // Find restaurant owned by this user
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (restaurant) {
      restaurant.openingTime = openingTime || restaurant.openingTime;
      restaurant.closingTime = closingTime || restaurant.closingTime;
      
      const updatedRestaurant = await restaurant.save();
      res.json(updatedRestaurant);
    } else {
      res.status(404).json({ message: "Restaurant not found for this owner" });
    }
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
