import axios from "axios"; // 👈 Axios use karna zyada stable hai backend ke liye

const sendEmail = async (options) => {
  console.log("📨 Email Sending Started (via Brevo API)...");

  const url = "https://api.brevo.com/v3/smtp/email";

  const htmlContent = options.html
    ? options.html
    : `<html><body><p>${
        options.message ? options.message.replace(/\n/g, "<br>") : ""
      }</p></body></html>`;

  const data = {
    sender: {
      name: "SwadKart Support",
      email: "swadkartt@gmail.com", // 👈 Ensure this is verified in Brevo Dashboard
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
    }
  } catch (error) {
    // 🔍 Detailed Error Logging
    console.error(
      "❌ EMAIL FAILED (Brevo):",
      error.response ? error.response.data : error.message
    );

    // Yahan hum error throw nahi karenge taki register process crash na ho
    // Magar debug ke liye log zaroor karenge
  }
};

export default sendEmail;
