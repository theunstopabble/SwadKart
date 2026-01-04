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
    const product = await Product.findById(req.params.id).populate(
      "reviews.user",
      "name image"
    ); // Populate reviewer details
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
// 👇 PROTECTED ROUTES (Admin / Restaurant Owner)
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
      variants, // Expecting Array
      addons, // Expecting Array
    } = req.body;

    const ownerId = restaurantId || req.user._id;

    const product = new Product({
      name,
      price,
      description,
      image: image || "https://placehold.co/400",
      category,
      isVeg: isVeg === undefined ? true : isVeg,
      orderIndex: orderIndex || 0,
      restaurant: ownerId,
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
      // 🛡️ SECURITY Check
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

      // Update basic fields
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

      // Update advanced fields (Variants/Addons)
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

// @desc    Toggle Product Availability
export const toggleProductStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      (product.restaurant &&
        product.restaurant.toString() === req.user._id.toString()) ||
      (product.user && product.user.toString() === req.user._id.toString());

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
// 👇 REVIEW SYSTEM (NEW ADDITION)
// ============================================================
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      // Check if user already reviewed
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

      // Calculate Average Rating
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
