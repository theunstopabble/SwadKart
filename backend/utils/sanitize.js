import mongoose from "mongoose";

/**
 * 🛡️ CodeQL FIX: Input Sanitization Utilities
 * All user inputs MUST pass through these before hitting MongoDB queries.
 */

// Validates and returns a clean string. Rejects objects/arrays (NoSQL injection vectors).
export const sanitizeString = (input) => {
  if (typeof input !== "string") return "";
  const sanitized = input.trim();
  // Block any string starting with a MongoDB operator ($ prefixed)
  if (/^\$/.test(sanitized)) return "";
  return sanitized;
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
  let cleanPhone = sanitizeString(phone);
  // Strip spaces, dashes, and parentheses which are common in phone formatting
  cleanPhone = cleanPhone.replace(/[\s\-\(\)]/g, "");
  
  if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
    throw new Error("Invalid phone format. Must be exactly 10 digits.");
  }
  return cleanPhone;
};
