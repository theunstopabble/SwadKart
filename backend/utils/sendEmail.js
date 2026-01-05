import axios from "axios";

/**
 * @desc Sends an email using Brevo (formerly Sendinblue) API v3
 * Fixed: Strictly uses .env variables. No hardcoded emails.
 */
const sendEmail = async (options) => {
  try {
    // 1. Env Variables Check
    const senderEmail = process.env.SMTP_MAIL;
    const apiKey = process.env.BREVO_API_KEY;

    // 🛡️ Safety Check: Agar .env me ye nahi mile, to yahi ruk jao.
    // Hardcoded email use karne se accha hai hum warning de de.
    if (!senderEmail || !apiKey) {
      console.warn(
        "⚠️ EMAIL SKIPPED: Missing 'SMTP_MAIL' or 'BREVO_API_KEY' in .env file."
      );
      return false;
    }

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
        email: senderEmail, // ✅ Sirf .env se lega (Perfect!)
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
        "api-key": apiKey, // ✅ Sirf .env se lega
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

    console.error("⚠️ EMAIL SYSTEM ERROR:", errorDetail);

    // 🔥 IMPORTANT: Error throw nahi kar rahe, taaki server chalta rahe.
    return false;
  }
};

export default sendEmail;
