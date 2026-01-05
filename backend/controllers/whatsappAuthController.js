import User from "../models/userModel.js";
import { sendWhatsAppMessage } from "../utils/whatsappService.js";

// @desc    Send OTP to WhatsApp
// @route   POST /api/v1/users/whatsapp-otp
export const sendWhatsAppOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400);
      throw new Error("Phone number is required");
    }

    // 6 डिजिट का रैंडम OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // यहाँ आप डेटाबेस में OTP सेव करने का लॉजिक जोड़ सकते हैं (User model में field बना कर)

    const message = `*SwadKart Registration* 🍕\n\nHi! Your verification code is: *${otp}*\n\nDo not share this code with anyone. Valid for 5 minutes.`;

    const sent = await sendWhatsAppMessage(phone, message);

    if (sent) {
      res
        .status(200)
        .json({ success: true, message: "OTP sent on WhatsApp! ✅" });
    } else {
      res.status(500);
      throw new Error("Failed to send WhatsApp message.");
    }
  } catch (error) {
    next(error);
  }
};
