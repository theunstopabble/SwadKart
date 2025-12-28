import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userModel.js";
import Product from "./models/productModel.js";
import Restaurant from "./models/restaurantModel.js"; // New Model
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const migrateData = async () => {
  try {
    console.log("⏳ Starting Migration...");

    // 1. Saare Restaurant Owners ko dhundo
    const owners = await User.find({ role: "restaurant_owner" });
    console.log(`👨‍🍳 Found ${owners.length} Owners (Real + Dummy)`);

    for (const owner of owners) {
      // 2. Check kro agar is owner ka restaurant pehle se bana hai to skip kro
      const existingRest = await Restaurant.findOne({ owner: owner._id });

      let restaurantId;

      if (!existingRest) {
        // Create NEW Restaurant Entry
        const newRest = await Restaurant.create({
          name: owner.name + " (Shop)", // Dukan ka naam User ke naam se
          owner: owner._id,
          image: owner.image || "https://placehold.co/600x400",
          address: "Default Address, India",
          rating: 4.5,
          numReviews: 10,
        });
        restaurantId = newRest._id;
        console.log(`✅ Created Restaurant for: ${owner.name}`);
      } else {
        restaurantId = existingRest._id;
        console.log(`ℹ️ Restaurant already exists for: ${owner.name}`);
      }

      // 3. AB SAARE PRODUCTS KO UPDATE KRO
      // Pehle Products user ID se link the, ab unhe Restaurant ID se link kro
      // Hum check karenge ki product.restaurant == owner._id hai kya?

      const updateResult = await Product.updateMany(
        { restaurant: owner._id }, // Find products linked to User ID
        { $set: { restaurant: restaurantId } } // Change to Restaurant ID
      );

      console.log(
        `   👉 Updated ${updateResult.modifiedCount} products to new ID.`
      );
    }

    console.log(
      "🔥 Migration Complete! Database is now structured like Swiggy/Zomato."
    );
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

migrateData();
