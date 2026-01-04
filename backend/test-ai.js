import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    console.log("🤖 Connecting to Gemini AI...");

    // hum wahi model test karenge jo error de raha tha
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent("Just say: Hello from AI");
    const response = await result.response;

    console.log("✅ SUCCESS! AI Response:", response.text());
  } catch (error) {
    console.error("❌ FAILED:", error.message);
  }
}

run();
