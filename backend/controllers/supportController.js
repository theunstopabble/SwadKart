import sendEmail from "../utils/sendEmail.js";

// @desc    Submit Contact Form
// @route   POST /api/v1/users/contact-support
// @access  Public
export const contactSupport = async (req, res, next) => {
  try {
    const { name, subject, message } = req.body;

    // 1. Validation
    if (!name || !subject || !message) {
      res.status(400);
      throw new Error("Please provide name, subject and message.");
    }

    // 2. Admin को ईमेल नोटिफिकेशन भेजना
    // process.env.SMTP_MAIL वही ईमेल है जो आपने Render/Local में सेट किया है
    const adminEmail = process.env.SMTP_MAIL;

    if (adminEmail) {
      await sendEmail({
        email: adminEmail,
        subject: `📩 SwadKart Support: ${subject}`,
        html: `
          <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 25px; border-radius: 10px; background-color: #fdfdfd;">
            <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">New Support Inquiry</h2>
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="background: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin-top: 10px;">
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 20px;">Sent via SwadKart Contact Form</p>
          </div>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: "Message dispatched successfully! Admin has been notified. 🚀",
    });
  } catch (error) {
    next(error);
  }
};
