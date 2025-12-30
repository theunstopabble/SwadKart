import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/productModel.js";

// 👇 API Key .env se load hogi
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithGenie = async (req, res) => {
  try {
    const { message } = req.body;

    // 1. Get current menu context
    const products = await Product.find({}).select(
      "name price category description isVeg"
    );

    const menuContext = products
      .map(
        (p) =>
          `${p.name} (${p.category}) - ₹${p.price} [${
            p.isVeg ? "Veg" : "Non-Veg"
          }]`
      )
      .join("\n");

    // 👇👇 FINAL FIX: Model Name Updated from your list 👇👇
    // Hum "gemini-2.0-flash" use kar rahe hain jo list mein available tha
 const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are 'SwadKart Genie', a friendly food assistant for the SwadKart delivery app.
      
      Here is our LIVE MENU:
      ${menuContext}

      RULES:
      1. Only recommend items from the menu above.
      2. If user asks for something not on menu, politely say we don't have it but suggest closest alternative.
      3. Keep answers short, emoji-rich 😋, and Hinglish (Hindi+English mix) style is preferred for Indian users.
      4. Do not take actual orders, just suggest items and tell them to "Add to Cart".
      5. If user says "I am sad/happy/angry", suggest food based on mood.

      User: ${message}
      Genie:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Genie Error:", error);
    res
      .status(500)
      .json({
        reply: "Sorry, I am updating my brain! Try again in a moment. 🧠✨",
      });
  }
};
