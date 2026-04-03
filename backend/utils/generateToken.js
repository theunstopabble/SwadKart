import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // Set HTTP-Only Cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development", // Use secure cookies in production (HTTPS)
    // 🛡️ FIX: Use "none" for cross-origin (Vercel → Render), "strict" for same-origin dev
    sameSite: process.env.NODE_ENV === "development" ? "strict" : "none",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
  });

  return token;
};

export default generateToken;
