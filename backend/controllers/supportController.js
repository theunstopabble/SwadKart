import sendEmail from "../utils/sendEmail.js";

// 🛡️ XSS FIX: Escape HTML to prevent injection in email templates
const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// @desc    Submit Contact Form
// @route   POST /api/v1/users/contact-support
// @access  Public
export const contactSupport = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // 1. Validation
    if (!name || !subject || !message) {
      res.status(400);
      throw new Error("Please provide name, subject and message.");
    }

    // 2. Send admin notification with user's reply-to email
    const adminEmail = process.env.SMTP_MAIL;

    if (!adminEmail) {
      res.status(500);
      throw new Error("Admin email (SMTP_MAIL) is not configured — support message cannot be sent.");
    }

    await sendEmail({
      email: adminEmail,
      subject: `SwadKart Support: ${escapeHtml(subject)}`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 25px; border-radius: 10px; background-color: #fdfdfd;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">New Support Inquiry</h2>
          <p><strong>From:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email) || "N/A"}">${escapeHtml(email) || "Not provided"}</a></p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <div style="background: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin-top: 10px;">
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>
          <p style="font-size: 12px; color: #777; margin-top: 20px;">Sent via SwadKart Contact Form</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Message dispatched successfully! Admin has been notified. 🚀",
    });
  } catch (error) {
    next(error);
  }
};
