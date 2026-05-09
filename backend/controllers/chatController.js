import Groq from "groq-sdk";
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

// Lazy-load pdf-parse to handle CJS/ESM interop
const getPdfParse = async () => {
  const mod = await import("pdf-parse");
  return mod.default || mod;
};

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
        const pdfParse = await getPdfParse();
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

const MAX_MESSAGE_LENGTH = 2000;

export const chatWithGenie = async (req, res) => {
  try {
    const { message, cartItems } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ reply: "Kuch boliyega toh hi madat karunga na! 🧞‍♂️" });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        reply: `Arre boss, message bahut lamba hai! Max ${MAX_MESSAGE_LENGTH} characters allowed. 😅`,
      });
    }

    // Early exit for anonymous callers — skip DB queries
    if (!userId) {
      const products = await Product.find({ countInStock: { $gt: 0 }, isAvailable: { $ne: false } })
        .select("name price category isVeg restaurant")
        .populate("restaurant", "name")
        .limit(20);

      const menuContext = products
        .map(
          (p) =>
            `- ${p.name} (${p.category}) from ${p.restaurant?.name || "SwadKart"}: ₹${p.price} [${p.isVeg ? "Veg" : "Non-Veg"}]`,
        )
        .join("\n");

      const systemPrompt = `
        You are 'SwadKart Genie' 🧞‍♂️, a funny, witty, and helpful food assistant for India.
        🎯 RULES:
        1. **Language:** Hinglish (Hindi + English mix). Use slang like "Boss", "Arre", "Bindaas".
        2. **Food Recs:** ONLY recommend items from [LIVE MENU]. Do not invent dishes.
        3. **Tone:** Short (max 2-3 sentences), helpful, emojis 🍕🍔.
        [LIVE MENU]: ${menuContext || "No items available"}
        `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 400,
      });

      return res.json({
        reply: chatCompletion.choices[0]?.message?.content || "Arre boss, signal weak hai! 📵",
        attachments: (req.files || []).map((f) => ({ name: f.originalname, type: f.mimetype, size: f.size })),
      });
    }

    // =================================================
    // 1️⃣ DATA GATHERING (Context Creation)
    // =================================================

    const [products, lastOrder, user] = await Promise.all([
      Product.find({ countInStock: { $gt: 0 }, isAvailable: { $ne: false } })
        .select("name price category isVeg restaurant")
        .populate("restaurant", "name")
        .limit(30),
      Order.findOne({ user: userId }).sort({ createdAt: -1 }),
      User.findById(userId).select("walletBalance"),
    ]);

    const menuContext = products
      .map(
        (p) =>
          `- ${p.name} (${p.category}) from ${p.restaurant?.name || "SwadKart"}: ₹${p.price} [${p.isVeg ? "Veg" : "Non-Veg"}]`,
      )
      .join("\n");

    const orderContext = lastOrder
      ? `Latest Order ID: #${lastOrder._id.toString().slice(-6)}, Status: ${lastOrder.orderStatus}, Items: ${lastOrder.orderItems.map((i) => i.name).join(", ")}, Total: ₹${lastOrder.totalPrice}`
      : "User has no recent orders.";

    const walletBalance = user?.walletBalance || 0;

    let cartContext = "User cart is currently empty.";
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      cartContext = cartItems
        .map((item) => `${item.qty}x ${item.name} (₹${item.price})`)
        .join(", ");
    }

    const attachmentContext = await extractAttachmentContext(req.files);

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

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply =
      chatCompletion.choices[0]?.message?.content ||
      "Arre boss, signal weak hai! 📵";

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
