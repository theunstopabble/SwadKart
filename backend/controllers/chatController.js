import Groq from "groq-sdk";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js"; // 👈 Import User model to fetch wallet balance
import dotenv from "dotenv";

dotenv.config();

// 🔑 Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * 📎 Extract text from uploaded file buffers
 * Supports: PDF, TXT, DOCX
 * Images: Metadata only (Groq Llama-3 is text-only)
 */
const extractAttachmentContext = async (files) => {
  if (!files || files.length === 0) return "";

  const results = [];
  for (const file of files) {
    const { originalname, mimetype, buffer, size } = file;
    let text = "";

    try {
      if (mimetype === "application/pdf") {
        const data = await pdfParse(buffer);
        text = data.text?.substring(0, 3000) || "";
      } else if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value?.substring(0, 3000) || "";
      } else if (mimetype === "text/plain") {
        text = buffer.toString("utf-8").substring(0, 3000);
      } else if (mimetype.startsWith("image/")) {
        text = `[Image file: ${originalname} (${(size / 1024).toFixed(1)}KB)]`;
      }
    } catch (err) {
      console.error(`Attachment parse error (${originalname}):`, err.message);
      text = `[Could not parse: ${originalname}]`;
    }

    results.push(`--- FILE: ${originalname} ---\n${text}`);
  }

  return results.join("\n\n");
};

export const chatWithGenie = async (req, res) => {
  try {
    const { message, cartItems } = req.body; // 👈 Include cartItems from request body
    const userId = req.user ? req.user._id : null;

    if (!message) {
      return res
        .status(400)
        .json({ reply: "Kuch boliyega toh hi madat karunga na! 🧞‍♂️" });
    }

    // =================================================
    // 1️⃣ DATA GATHERING (Context Creation)
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

    // C. Fetch Wallet Balance & Format Cart Items (STEP 2)
    let walletBalance = 0;
    if (userId) {
      const user = await User.findById(userId).select("walletBalance");
      if (user) walletBalance = user.walletBalance || 0;
    }

    let cartContext = "User cart is currently empty.";
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      cartContext = cartItems
        .map((item) => `${item.qty}x ${item.name} (₹${item.price})`)
        .join(", ");
    }

    // ⬇️ FEAT-15: Extract text from uploaded attachments (PDF, DOCX, TXT, Image metadata)
    const attachmentContext = await extractAttachmentContext(req.files);

    // =================================================
    // 2️⃣ BRAIN CONFIGURATION (Groq Llama-3)
    // =================================================

    // 🧠 System Prompt (Instructions)
    const systemPrompt = `
        You are 'SwadKart Genie' 🧞‍♂️, a funny, witty, and helpful food assistant for India.

        🛑 CONTEXT DATA:
        [USER'S LAST ORDER]: ${orderContext}
        [USER'S WALLET BALANCE]: ₹${walletBalance}
        [USER'S CURRENT CART]: ${cartContext}
        [LIVE MENU]: 
        ${menuContext}
        ${attachmentContext ? `[USER ATTACHMENTS]:\n${attachmentContext}` : ""}

        🎯 RULES:
        1. **Language:** Hinglish (Hindi + English mix). Use slang like "Boss", "Arre", "Bindaas".
        2. **Order Status:** If asked "Where is my order?", use [USER'S LAST ORDER] info.
        3. **Food Recs:** ONLY recommend items from [LIVE MENU]. Do not invent dishes.
        4. **Smart Salesperson:** Read [USER'S CURRENT CART] and [USER'S WALLET BALANCE]. Suggest pairings based on the cart (e.g., if they have a Burger, offer Coke). If they have wallet balance, remind them to use their Swad Wallet!
        5. **Navigation:** Cart? -> "Check Cart 🛍️". Profile? -> "Profile section".
        6. **Tone:** Short (max 2-3 sentences), helpful, emojis 🍕🍔.
        7. **Attachments:** If user uploaded a PDF/TXT/DOCX with food preferences, dietary restrictions, or a menu, read the content and recommend accordingly. If they uploaded an image, say you can't see images yet but will help based on their message!
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
      max_tokens: 400,
    });

    const reply =
      chatCompletion.choices[0]?.message?.content ||
      "Arre boss, signal weak hai! 📵";

    // =================================================
    // 3️⃣ SEND RESPONSE
    // =================================================
    res.json({
      reply: reply.trim(),
      attachments: (req.files || []).map((f) => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      })),
    });
  } catch (error) {
    console.error("🧞‍♂️ Genie Brain Freeze (Groq):", error.message);
    res.status(500).json({
      reply:
        "Arre boss! Server thoda busy hai. 2 minute baad try karna! 😴 (AI Error)",
    });
  }
};
