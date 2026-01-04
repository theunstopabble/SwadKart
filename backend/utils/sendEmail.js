import axios from "axios";

/**
 * @desc Sends an email using Brevo (formerly Sendinblue) API v3
 */
const sendEmail = async (options) => {
  console.log(
    `📨 Attempting to send email to: ${options.email} (via Brevo API)`
  );

  const url = "https://api.brevo.com/v3/smtp/email";

  // 🛠️ HTML content fallback: Agar options.html nahi hai toh message ko HTML me convert karo
  const htmlContent = options.html
    ? options.html
    : `<html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>${
          options.message
            ? options.message.replace(/\n/g, "<br>")
            : "No message content provided."
        }</p>
      </body></html>`;

  // API Payload setup
  const data = {
    sender: {
      name: "SwadKart Support",
      email: process.env.SMTP_MAIL || "swadkartt@gmail.com", // Brevo me verified hona chahiye
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

  try {
    const response = await axios.post(url, data, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY, // Render/Local Dashboard key
        "content-type": "application/json",
      },
    });

    // Brevo usually returns 201 Created for successful sends
    if (response.status === 201 || response.status === 200) {
      console.log("✅ Email Dispatched Successfully!");
      return true;
    }
  } catch (error) {
    // 🔍 Error Traceability
    const errorDetail = error.response ? error.response.data : error.message;
    console.error("❌ EMAIL FAILED (Brevo API):", errorDetail);

    // Controller ko error pass karna zaroori hai
    throw new Error(
      `Email Service Error: ${
        errorDetail.message || "Could not reach Brevo gateway."
      }`
    );
  }
};

export default sendEmail;
