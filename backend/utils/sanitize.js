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
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length < 1 || domain.length < 4) return false;
  if (!domain.includes(".")) return false;
  if (local[0] === "." || local.at(-1) === ".") return false;
  if (domain[0] === "." || domain.at(-1) === ".") return false;
  return true;
}

export const sanitizeEmail = (email) => {
  const cleanEmail = sanitizeString(email);
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
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
