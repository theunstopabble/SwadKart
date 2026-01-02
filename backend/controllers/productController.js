import Product from "../models/productModel.js";

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
    const product = await Product.findById(req.params.id);
    if (product) res.json(product);
    else res.status(404).json({ message: "Product not found" });
  } catch (error) {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc    Fetch products by Restaurant ID
export const getProductsByRestaurant = async (req, res) => {
  try {
    const products = await Product.find({
      $or: [{ restaurant: req.params.id }, { user: req.params.id }],
    }).sort({ orderIndex: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// 👇 PROTECTED ROUTES
// ============================================================

// @desc    Create a product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      image,
      category,
      countInStock,
      restaurantId,
      isVeg,
      orderIndex,
      variants,
      addons,
    } = req.body;

    // Jo owner login hai wahi ID jayegi
    const ownerId = restaurantId || req.user._id;

    const product = new Product({
      name,
      price,
      description,
      image: image || "https://placehold.co/400",
      category,
      isVeg: isVeg === undefined ? true : isVeg,
      orderIndex: orderIndex || 0,
      restaurant: ownerId, // Essential for Dashboard
      user: ownerId,
      countInStock: countInStock || 100,
      variants: variants || [],
      addons: addons || [],
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // 🛡️ SECURITY: Admin OR Owner (Checking both fields)
      const isOwner =
        (product.restaurant &&
          product.restaurant.toString() === req.user._id.toString()) ||
        (product.user && product.user.toString() === req.user._id.toString());
      const isAdmin = req.user.role === "admin";

      if (!isAdmin && !isOwner) {
        return res
          .status(401)
          .json({ message: "Not authorized to update this product" });
      }

      Object.assign(product, req.body);
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
        (product.restaurant &&
          product.restaurant.toString() === req.user._id.toString()) ||
        (product.user && product.user.toString() === req.user._id.toString());
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

// @desc    ⚡ Toggle Product Availability (The Fixed Function)
export const toggleProductStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🛡️ SECURITY LOGS: Check terminal to see if IDs match
    console.log("--- Toggle Stock Debug ---");
    console.log("Login User ID:", req.user._id.toString());
    console.log("DB Restaurant ID:", product.restaurant?.toString());
    console.log("DB User ID:", product.user?.toString());

    const isAdmin = req.user.role === "admin";

    // Check ownership against both restaurant and user fields for safety
    const isOwner =
      (product.restaurant &&
        product.restaurant.toString() === req.user._id.toString()) ||
      (product.user && product.user.toString() === req.user._id.toString());

    if (isAdmin || isOwner) {
      // Toggle: If > 0 make it 0, else make it 100
      product.countInStock = product.countInStock > 0 ? 0 : 100;

      const updatedProduct = await product.save();

      // 📡 SOCKET EMIT for real-time UI
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
