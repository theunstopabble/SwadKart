import mongoose from "mongoose";

/**
 * 🛡️ CodeQL FIX: Input Sanitization Utilities
 * All user inputs MUST pass through these before hitting MongoDB queries.
 */

// Validates and returns a clean string. Rejects objects/arrays (NoSQL injection vectors).
export const sanitizeString = (input) => {
  if (typeof input !== "string") return "";
  return input.trim();
};

// Validates MongoDB ObjectId format. Rejects injection payloads.
export const sanitizeObjectId = (id) => {
  const cleanId = sanitizeString(id);
  if (!mongoose.Types.ObjectId.isValid(cleanId)) {
    throw new Error("Invalid ID format");
  }
  return cleanId;
};

// Validates email is a plain string, not an object with $gt/$ne operators.
export const sanitizeEmail = (email) => {
  const cleanEmail = sanitizeString(email);
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Invalid email format");
  }
  return cleanEmail.toLowerCase();
};

// Validates phone is a plain string of digits.
export const sanitizePhone = (phone) => {
  const cleanPhone = sanitizeString(phone);
  if (!cleanPhone || !/^\+?\d{7,15}$/.test(cleanPhone)) {
    throw new Error("Invalid phone format");
  }
  return cleanPhone;
};
