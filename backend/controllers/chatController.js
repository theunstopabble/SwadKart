import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/productModel.js";

// 🔑 Initialize Gemini with API Key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithGenie = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message missing! 🧞‍♂️" });
    }

    // 1. Fetch live menu - Hum sirf wahi dikhayenge jo inStock hai
    // Note: Agar aapke model me 'countInStock' field hai to wahan check badal lena
    const products = await Product.find({}).select(
      "name price category description isVeg countInStock"
    );

    const menuContext = products
      .map(
        (p) =>
          `- ${p.name} (${p.category}): ₹${p.price} [${
            p.isVeg ? "Veg" : "Non-Veg"
          }] - ${p.description}`
      )
      .join("\n");

    // 2. Configure Gemini Model - Using your preferred "gemini-flash-latest"
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.8, // Slightly higher for more creative "Hinglish"
      },
    });

    const prompt = `
      You are 'SwadKart Genie' 🧞‍♂️, a witty and helpful Hinglish-speaking food assistant for SwadKart App. 
      Your personality: Super friendly, food expert, and a bit funny.

      CURRENT LIVE MENU:
      ${menuContext}

      STRICT RULES:
      1. Recommendation: ONLY suggest items from the LIVE MENU above. 
      2. Missing Item: If the user asks for something not in the list, say: "Arre yaar, ye toh kitchen mein nahi hai, par humara [Similar Item] try karo! 😋"
      3. Style: Speak in Hinglish (Mix of Hindi + English). Use Indian food slang if needed.
      4. Length: Keep it short (2-3 sentences). Use Emojis.
      5. Action: Always tell them to "Add to Cart" or "Explore the Menu".
      6. Mood Matching: Recommend heavy meals for "Hungry", light snacks for "Bored", and sweets for "Happy".

      User Message: ${message}
      Genie Response:
    `;

    // 3. Generate content from AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 4. Send clean response
    res.json({ reply: text.trim() });
  } catch (error) {
    console.error("Genie Brain Error:", error);
    res.status(500).json({
      reply:
        "Arre yaar! Genie thoda thak gaya hai 😴. Ek baar fir se try karna? ✨",
    });
  }
};
