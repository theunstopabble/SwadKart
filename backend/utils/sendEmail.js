import axios from "axios"; // 👈 Axios use karna zyada stable hai backend ke liye

const sendEmail = async (options) => {
  console.log("📨 Email Sending Started (via Brevo API)...");

  const url = "https://api.brevo.com/v3/smtp/email";

  // HTML content handle karna agar options me na ho
  const htmlContent = options.html
    ? options.html
    : `<html><body><p>${
        options.message ? options.message.replace(/\n/g, "<br>") : ""
      }</p></body></html>`;

  const data = {
    sender: {
      name: "SwadKart Support",
      email: "swadkartt@gmail.com", // 👈 Ensure this email is verified in Brevo Dashboard
    },
    to: [
      {
        email: options.email,
        name: options.email.split("@")[0],
      },
    ],
    subject: options.subject,
    htmlContent: htmlContent,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY, // 👈 Render Dashboard se pick karega
        "content-type": "application/json",
      },
    });

    if (response.status === 201 || response.status === 200) {
      console.log("✅ Email Sent Successfully via Brevo API!");
      return true;
    }
  } catch (error) {
    // 🔍 Detailed Error Logging
    console.error(
      "❌ EMAIL FAILED (Brevo):",
      error.response ? error.response.data : error.message
    );

    // Note: Hum yahan error throw kar rahe hain taaki Controller ko pata chale ki email fail ho gaya
    // Agar ye silent rahega to user ko lagega OTP chala gaya jabki wo fail ho chuka hoga.
    throw new Error("Email could not be sent. Please try again later.");
  }
};

export default sendEmail;
