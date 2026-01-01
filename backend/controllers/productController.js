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

    const products = await Product.find({ ...keyword }).sort({ orderIndex: 1 });
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

// @desc    Fetch products by Restaurant ID (Sorted by custom order)
export const getProductsByRestaurant = async (req, res) => {
  try {
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
      if (
        req.user.isAdmin ||
        req.user.role === "admin" ||
        product.restaurant.toString() === req.user._id.toString()
      ) {
        await product.deleteOne();
        res.json({ message: "Product removed" });
      } else {
        res
          .status(401)
          .json({ message: "Not authorized to delete this product" });
      }
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
      variants,
      addons,
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      if (
        !req.user.isAdmin &&
        req.user.role !== "admin" &&
        product.restaurant.toString() !== req.user._id.toString()
      ) {
        return res
          .status(401)
          .json({ message: "Not authorized to update this product" });
      }

      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      product.image = image || product.image;
      product.category = category || product.category;

      if (countInStock !== undefined) product.countInStock = countInStock;
      if (isVeg !== undefined) product.isVeg = isVeg;
      if (orderIndex !== undefined) product.orderIndex = orderIndex;
      if (variants !== undefined) product.variants = variants;
      if (addons !== undefined) product.addons = addons;

      const updatedProduct = await product.save();

      // OPTIONAL: Update product ke baad bhi emit kar sakte hain
      if (req.io) {
        req.io.emit("productUpdated", updatedProduct);
      }

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    ⚡ Toggle Product Availability (One-Click Out of Stock) & SOCKET EMIT
// @route   PATCH /api/products/:id/toggle-stock
export const toggleProductStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Security Check
      if (
        req.user.isAdmin ||
        req.user.role === "admin" ||
        product.restaurant.toString() === req.user._id.toString()
      ) {
        // Toggle Logic
        product.countInStock = product.countInStock > 0 ? 0 : 100;

        const updatedProduct = await product.save();

        // 🔥 CRITICAL CHANGE: Socket Emit Here
        if (req.io) {
          req.io.emit("productUpdated", updatedProduct);
          console.log(
            `📡 Socket Emitted: productUpdated for ${updatedProduct.name}`
          );
        } else {
          console.warn("⚠️ Socket IO instance (req.io) not found!");
        }

        res.json(updatedProduct);
      } else {
        res
          .status(401)
          .json({ message: "Not authorized to modify this product" });
      }
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
