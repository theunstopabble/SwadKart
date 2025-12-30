import Product from "../models/productModel.js";

// ============================================================
// 👇 PUBLIC ROUTES (Sabke liye open)
// ============================================================

// @desc    Fetch all products (Search & Filter)
export const getProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? { name: { $regex: req.query.keyword, $options: "i" } }
      : {};

    const products = await Product.find({ ...keyword }).sort({ orderIndex: 1 }); // 👈 Global list mein bhi sorting
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc    Fetch products by Restaurant ID (With Sorting logic)
export const getProductsByRestaurant = async (req, res) => {
  try {
    // 👈 IMPORTANT: .sort({ orderIndex: 1 }) lagaya taaki items reorder sequence mein aayein
    const products = await Product.find({
      $or: [{ restaurant: req.params.id }, { user: req.params.id }],
    }).sort({ orderIndex: 1 });

    res.json(products);
  } catch (error) {
    console.error("❌ Error fetching menu:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// 👇 PROTECTED ROUTES (Admin / Restaurant Owner Only)
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
      // 👇 NEW: Destructure Variants & Addons
      variants,
      addons,
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
      numReviews: 0,
      // 👇 NEW: Save Arrays (Default empty if not provided)
      variants: variants || [],
      addons: addons || [],
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.json({ message: "Product removed" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a product
export const updateProduct = async (req, res) => {
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
      // 👇 NEW: Get updated lists
      variants,
      addons,
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      product.image = image || product.image;
      product.category = category || product.category;
      product.countInStock = countInStock || product.countInStock;

      // 👈 Fix: Boolean validation
      if (isVeg !== undefined) {
        product.isVeg = isVeg;
      }

      // 👈 Fix: Order Index update
      if (orderIndex !== undefined) {
        product.orderIndex = orderIndex;
      }

      // 👇 NEW: Update Variants & Addons (Replace old array with new)
      if (variants !== undefined) {
        product.variants = variants;
      }
      if (addons !== undefined) {
        product.addons = addons;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
