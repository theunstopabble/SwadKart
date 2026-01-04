import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  console.log("🔍 Checking available Gemini Models for your API Key...");

  if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY not found in .env file");
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    const data = await response.json();

    if (data.error) {
      console.error("❌ API Error:", data.error.message);
    } else {
      console.log("✅ Available Models:");
      // Filter only generateContent supported models
      const chatModels = data.models?.filter((m) =>
        m.supportedGenerationMethods.includes("generateContent")
      );

      chatModels.forEach((model) => {
        console.log(`   👉 ${model.name.replace("models/", "")}`);
      });

      if (chatModels.length === 0) {
        console.log(
          "⚠️ No chat models found. Check your Google Cloud Project settings."
        );
      }
    }
  } catch (error) {
    console.error("❌ Network Error:", error.message);
  }
}

listModels();
