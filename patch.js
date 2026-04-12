export const getProductsByRestaurant = asyncHandler(async (req, res) => {
  const inputId = req.params.id;
  let restaurant = await import("../models/restaurantModel.js").then((m) =>
    m.default.findById(inputId)
  );
  if (!restaurant) {
    restaurant = await import("../models/restaurantModel.js").then((m) =>
      m.default.findOne({ owner: inputId })
    );
  }
  if (!restaurant) return res.status(200).json([]);
  const actualRestaurantId = restaurant._id.toString();
  const cacheKey = `menu_rest_${actualRestaurantId}`;
  let products = await getCache(cacheKey);
  if (!products) {
    products = await Product.find({ restaurant: actualRestaurantId });
    await setCache(cacheKey, products, 3600);
  }
  res.status(200).json(products);
});
