import axios from "axios";

/**
 * @desc Sends an email using Brevo (formerly Sendinblue) API v3
 * Fixed: This function will NOT throw errors that crash the main process.
 */
const sendEmail = async (options) => {
  try {
    console.log(`📨 Sending email to: ${options.email}`);

    const url = "https://api.brevo.com/v3/smtp/email";

    // 🛠️ HTML content fallback
    const htmlContent = options.html
      ? options.html
      : `<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>${
            options.message
              ? options.message.replace(/\n/g, "<br>")
              : "No message content."
          }</p>
        </body></html>`;

    const data = {
      sender: {
        name: "SwadKart Support",
        email: process.env.SMTP_MAIL || "swadkartt@gmail.com",
      },
      to: [
        {
          email: options.email,
          name: options.email ? options.email.split("@")[0] : "User",
        },
      ],
      subject: options.subject || "SwadKart Notification",
      htmlContent: htmlContent,
    };

    const response = await axios.post(url, data, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
    });

    if (response.status === 201 || response.status === 200) {
      console.log("✅ Email sent successfully!");
      return true;
    }
  } catch (error) {
    // 🔍 Error logging without crashing the server
    const errorDetail = error.response ? error.response.data : error.message;

    // अगर API Key गलत है या कोटा खत्म है, तो यहाँ दिखेगा:
    console.error("⚠️ EMAIL SYSTEM LOG:", errorDetail);

    // 🔥 IMPORTANT: Hum Error throw nahi kar rahe, taaki user register ho sake.
    return false;
  }
};

export default sendEmail;
