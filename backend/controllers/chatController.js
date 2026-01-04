import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";

// 🔑 Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithGenie = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!message) {
      return res
        .status(400)
        .json({ reply: "Kuch boliyega toh hi madat karunga na! 🧞‍♂️" });
    }

    // =================================================
    // 1️⃣ DATA GATHERING (Context Creation)
    // =================================================

    // A. Fetch Live Menu (Items in Stock only)
    const products = await Product.find({ countInStock: { $gt: 0 } })
      .select("name price category isVeg restaurant")
      .populate("restaurant", "name")
      .limit(30); // Optimizing token usage

    const menuContext = products
      .map(
        (p) =>
          `- ${p.name} (${p.category}) from ${
            p.restaurant?.name || "SwadKart"
          }: ₹${p.price} [${p.isVeg ? "Veg" : "Non-Veg"}]`
      )
      .join("\n");

    // B. Fetch Recent Order (If User Logged In)
    let orderContext =
      "User is currently not logged in or has no recent orders.";

    if (userId) {
      const lastOrder = await Order.findOne({ user: userId }).sort({
        createdAt: -1,
      });
      if (lastOrder) {
        orderContext = `
          Latest Order ID: #${lastOrder._id.toString().slice(-6)}
          Status: ${lastOrder.orderStatus}
          Items: ${lastOrder.orderItems.map((i) => i.name).join(", ")}
          Total: ₹${lastOrder.totalPrice}
          Payment: ${lastOrder.isPaid ? "Paid" : "Pending"}
        `;
      }
    }

    // =================================================
    // 2️⃣ BRAIN CONFIGURATION (Smart Model Selector)
    // =================================================

    // 🧠 INDUSTRY STANDARD APPROACH:
    // Try the newest/fastest model first. If it fails (404/API limits), fallback to the stable one.
    const modelsToTry = [
      
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ];

    let generatedText = "";
    let success = false;

    const prompt = `
      You are 'SwadKart Genie' 🧞‍♂️, a funny, witty, and helpful food assistant for India.
      
      🛑 CONTEXT DATA:
      [USER'S LAST ORDER]: ${orderContext}
      [LIVE MENU]: 
      ${menuContext}

      🎯 RULES:
      1. **Language:** Hinglish (Hindi + English mix). Use slang like "Boss", "Arre", "Bindaas".
      2. **Order Status:** If asked "Where is my order?", use [USER'S LAST ORDER] info.
      3. **Food Recs:** ONLY recommend items from [LIVE MENU]. Do not invent dishes.
      4. **Navigation:**
         - Cart? -> "Check the Cart bag 🛍️ icon on top!"
         - Profile? -> "Menu mein Profile section check karo."
      5. **Tone:** Short (max 2-3 sentences), helpful, and use emojis 🍕🍔.

      👤 User: "${message}"
      🧞‍♂️ Genie:
    `;

    // 🔄 Robust Fallback Loop
    for (const modelName of modelsToTry) {
      try {
        // console.log(`🤖 Trying AI Model: ${modelName}...`); // Optional Debug Log
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        generatedText = response.text();

        if (generatedText) {
          success = true;
          break; // Stop loop if successful
        }
      } catch (err) {
        console.warn(`⚠️ Model ${modelName} failed. Switching to backup...`);
        // Continue to next model in the list
      }
    }

    if (!success) {
      throw new Error("All AI models failed to respond.");
    }

    // =================================================
    // 3️⃣ SEND RESPONSE
    // =================================================
    res.json({ reply: generatedText.trim() });
  } catch (error) {
    console.error("🧞‍♂️ Genie Brain Freeze:", error.message);
    res.status(500).json({
      reply:
        "Arre boss! Server thoda busy hai. 2 minute baad try karna! 😴 (AI Service Unavailable)",
    });
  }
};
