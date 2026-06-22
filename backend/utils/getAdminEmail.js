import User from "../models/userModel.js";

/**
 * Resolve the admin email address that should receive alerts.
 * Priority:
 *   1. SMTP_MAIL environment variable (single source of truth for ops)
 *   2. First user with role === "admin" in the database
 *   3. null if no admin is configured
 */
export const getAdminEmail = async () => {
  if (process.env.SMTP_MAIL) {
    return process.env.SMTP_MAIL;
  }

  try {
    const admin = await User.findOne({ role: "admin" }).select("email").lean();
    if (admin?.email) {
      console.warn(
        "⚠️ SMTP_MAIL not set; falling back to admin user's email from DB.",
      );
      return admin.email;
    }
  } catch (err) {
    console.error("❌ Failed to look up admin email:", err.message);
  }

  console.error(
    "❌ No admin email available. Set SMTP_MAIL or create an admin user.",
  );
  return null;
};

export default getAdminEmail;
