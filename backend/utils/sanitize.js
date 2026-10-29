/**
 * Input Sanitization Utilities
 * All user inputs pass through these before hitting database queries.
 */

// Validates and returns a clean string. Rejects objects/arrays.
export const sanitizeString = (input) => {
  if (typeof input !== "string") return "";
  const sanitized = input.trim();
  // Block any string starting with a MongoDB operator ($ prefixed)
  if (/^\$/.test(sanitized)) return "";
  return sanitized;
};

// Validates ID format (supports CUIDs, UUIDs, and legacy 24-char hex ObjectIDs). Rejects injection payloads.
export const sanitizeObjectId = (id) => {
  const cleanId = sanitizeString(id);
  if (!cleanId || !/^[a-zA-Z0-9_-]{8,36}$/.test(cleanId)) {
    throw new Error("Invalid ID format");
  }
  return cleanId;
};

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
