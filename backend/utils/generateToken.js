import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  const isProduction = process.env.NODE_ENV === "production";

  // Set HTTP-Only Cookie
  // Local: secure=false, sameSite=lax → works on http://localhost
  // Production: secure=true, sameSite=none → works on HTTPS cross-origin
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
  });

  return token;
};

export default generateToken;
