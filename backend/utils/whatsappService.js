import axios from "axios";

/**
 * @desc Sends OTP or Notifications via WhatsApp (Evolution API)
 */
export const sendWhatsAppMessage = async (number, message) => {
  try {
    // Evolution API URL और API Key (इनको .env में डालना होगा)
    const instance_url = process.env.WHATSAPP_INSTANCE_URL;
    const api_key = process.env.WHATSAPP_API_KEY;

    if (!instance_url || !api_key) {
      console.warn("⚠️ WhatsApp variables missing in .env");
      return false;
    }

    // नंबर को सही फॉर्मेट में करना (जैसे +91...)
    const cleanNumber = number.replace(/\D/g, "");

    const url = `${instance_url}/message/sendText/${process.env.WHATSAPP_INSTANCE_NAME}`;

    const data = {
      number: cleanNumber,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false,
      },
      textMessage: {
        text: message,
      },
    };

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        apikey: api_key,
      },
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`✅ WhatsApp sent to ${cleanNumber}`);
      return true;
    }
  } catch (error) {
    console.error("❌ WhatsApp Error:", error.response?.data || error.message);
    return false;
  }
};
