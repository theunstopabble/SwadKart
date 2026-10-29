import bcrypt from "bcryptjs";
import crypto from "crypto";

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const matchPassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

export const generateResetToken = () => {
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return { resetToken, resetPasswordToken, resetPasswordExpire };
};

export const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

