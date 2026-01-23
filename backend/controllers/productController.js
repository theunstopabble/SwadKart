import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js"; // ✅ Import Zaroori Hai

// ============================================================
// 👇 PUBLIC ROUTES
// ============================================================

// @desc    Fetch all products
export const getProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? { name: { $regex: req.query.keyword, $options: "i" } }
      : {};
    const products = await Product.find({ ...keyword }).sort({ orderIndex: 1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "reviews.user",
      "name image"
    );
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc    Fetch products by Restaurant ID
// 🔴 FIX: Handles fetching when Frontend sends Owner ID instead of Restaurant ID
export const getProductsByRestaurant = async (req, res) => {
  try {
    const id = req.params.id; // Ye Owner ID ho sakti hai (Admin Panel se)
    let queryId = id;

    // 🔍 Step 1: Check karo kya ye ID kisi Owner ki hai?
    const restaurantByOwner = await Restaurant.findOne({ owner: id });
    
    // Agar Owner mil gaya, toh uski 'Restaurant ID' use karo products dhoondne ke liye
    if (restaurantByOwner) {
      queryId = restaurantByOwner._id;
    }

    // 🔍 Step 2: Ab Products dhoondo (Resolved ID se)
    const products = await Product.find({
      $or: [
        { restaurant: queryId }, // Match resolved Restaurant ID
        { user: id }             // Fallback: Match User ID directly (Old logic)
      ],
    }).sort({ orderIndex: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// 👇 PROTECTED ROUTES (Admin / Restaurant Owner)
// ============================================================

// @desc    Create a product (✅ FIXED: Supports Admin adding to Dummy Shops)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      image,
      category,
      countInStock,
      isVeg,
      orderIndex,
      variants,
      addons,
      restaurantId, // 👈 Frontend se aayi hui Owner/Restaurant ID
    } = req.body;

    let restaurant;

    // 🔍 LOGIC: Sahi Restaurant Dhoondo
    if (restaurantId) {
      // CASE 1: Admin ne Dropdown se select kiya
      // Pehle Owner ID samajh kar dhoondo
      restaurant = await Restaurant.findOne({ owner: restaurantId });

      // Agar Owner se nahi mila, toh check karo kya ye seedha Restaurant ID thi?
      if (!restaurant) {
        restaurant = await Restaurant.findById(restaurantId);
      }
    } else {
      // CASE 2: Owner khud add kar raha hai (Logged in user hi owner hai)
      restaurant = await Restaurant.findOne({ owner: req.user._id });
    }

    // Agar ab bhi nahi mila
    if (!restaurant) {
      return res.status(404).json({
        message: "No Restaurant found for this owner. Ensure Dummy Shop is linked correctly.",
      });
    }

    // 🛠️ Product Create karo
    const product = new Product({
      name,
      price,
      description,
      image: image || "https://placehold.co/400",
      category,
      isVeg: isVeg === undefined ? true : isVeg,
      orderIndex: orderIndex || 0,

      restaurant: restaurant._id, // ✅ Asli Dukan ki ID (Database se mili hui)
      user: req.user._id,         // ✅ Created By (Admin/User)

      countInStock: countInStock || 100,
      variants: variants || [],
      addons: addons || [],
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Create Product Error:", error.message);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // 🛡️ SECURITY Check
      const isOwner =
        product.user && product.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (!isAdmin && !isOwner) {
        return res
          .status(401)
          .json({ message: "Not authorized to update this product" });
      }

      // Update fields
      product.name = req.body.name || product.name;
      product.price = req.body.price || product.price;
      product.description = req.body.description || product.description;
      product.image = req.body.image || product.image;
      product.category = req.body.category || product.category;
      product.countInStock =
        req.body.countInStock !== undefined
          ? req.body.countInStock
          : product.countInStock;
      product.isVeg =
        req.body.isVeg !== undefined ? req.body.isVeg : product.isVeg;

      if (req.body.variants) product.variants = req.body.variants;
      if (req.body.addons) product.addons = req.body.addons;

      const updatedProduct = await product.save();

      if (req.io) req.io.emit("productUpdated", updatedProduct);
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      const isOwner =
        product.user && product.user.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      if (isAdmin || isOwner) {
        await product.deleteOne();
        res.json({ message: "Product removed" });
      } else {
        res.status(401).json({ message: "Not authorized" });
      }
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Product Availability
export const toggleProductStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      product.user && product.user.toString() === req.user._id.toString();

    if (isAdmin || isOwner) {
      product.countInStock = product.countInStock > 0 ? 0 : 100;
      const updatedProduct = await product.save();

      if (req.io) {
        req.io.emit("productUpdated", updatedProduct);
      }

      return res.json(updatedProduct);
    } else {
      return res.status(401).json({
        message: "Unauthorized: You don't own this product.",
      });
    }
  } catch (error) {
    console.error("Toggle Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// 👇 REVIEW SYSTEM
// ============================================================
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: "Product already reviewed" });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;

      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
