import Groq from "groq-sdk";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import dotenv from "dotenv";

dotenv.config();

// 🔑 Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    // 1️⃣ DATA GATHERING (Context Creation) - [SAME AS BEFORE]
    // =================================================

    // A. Fetch Live Menu
    const products = await Product.find({ countInStock: { $gt: 0 } })
      .select("name price category isVeg restaurant")
      .populate("restaurant", "name")
      .limit(30);

    const menuContext = products
      .map(
        (p) =>
          `- ${p.name} (${p.category}) from ${p.restaurant?.name || "SwadKart"}: ₹${p.price} [${p.isVeg ? "Veg" : "Non-Veg"}]`,
      )
      .join("\n");

    // B. Fetch Recent Order
    let orderContext =
      "User is currently not logged in or has no recent orders.";
    if (userId) {
      const lastOrder = await Order.findOne({ user: userId }).sort({
        createdAt: -1,
      });
      if (lastOrder) {
        orderContext = `Latest Order ID: #${lastOrder._id.toString().slice(-6)}, Status: ${lastOrder.orderStatus}, Items: ${lastOrder.orderItems.map((i) => i.name).join(", ")}, Total: ₹${lastOrder.totalPrice}`;
      }
    }

    // =================================================
    // 2️⃣ BRAIN CONFIGURATION (Groq Llama-3)
    // =================================================

    // 🧠 System Prompt (Instructions)
    const systemPrompt = `
        You are 'SwadKart Genie' 🧞‍♂️, a funny, witty, and helpful food assistant for India.
        
        🛑 CONTEXT DATA:
        [USER'S LAST ORDER]: ${orderContext}
        [LIVE MENU]: 
        ${menuContext}

        🎯 RULES:
        1. **Language:** Hinglish (Hindi + English mix). Use slang like "Boss", "Arre", "Bindaas".
        2. **Order Status:** If asked "Where is my order?", use [USER'S LAST ORDER] info.
        3. **Food Recs:** ONLY recommend items from [LIVE MENU]. Do not invent dishes.
        4. **Navigation:** Cart? -> "Check Cart 🛍️". Profile? -> "Profile section".
        5. **Tone:** Short (max 2-3 sentences), helpful, emojis 🍕🍔.
        `;

    // 🚀 Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      // Super fast model
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply =
      chatCompletion.choices[0]?.message?.content ||
      "Arre boss, signal weak hai! 📵";

    // =================================================
    // 3️⃣ SEND RESPONSE
    // =================================================
    res.json({ reply: reply.trim() });
  } catch (error) {
    console.error("🧞‍♂️ Genie Brain Freeze (Groq):", error.message);
    res.status(500).json({
      reply:
        "Arre boss! Server thoda busy hai. 2 minute baad try karna! 😴 (AI Error)",
    });
  }
};
