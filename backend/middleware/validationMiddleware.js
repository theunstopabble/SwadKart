// Lightweight request validation middleware (zero external deps)
// Use for critical public endpoints that receive untrusted user input

const PHONE_REGEX = /^[6-9]\d{9}$/;

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

const validators = {
  register: (body) => {
    const errors = [];
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    if (!body.email || !isValidEmail(body.email)) {
      errors.push("Valid email is required");
    }
    if (!body.password || typeof body.password !== "string" || body.password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    if (!body.phone || !PHONE_REGEX.test(body.phone)) {
      errors.push("Valid 10-digit Indian phone number is required");
    }
    return errors;
  },
  login: (body) => {
    const errors = [];
    if (!body.email || !isValidEmail(body.email)) {
      errors.push("Valid email is required");
    }
    if (!body.password || typeof body.password !== "string" || body.password.length < 1) {
      errors.push("Password is required");
    }
    return errors;
  },
  forgotPassword: (body) => {
    const errors = [];
    if (!body.email || !isValidEmail(body.email)) {
      errors.push("Valid email is required");
    }
    return errors;
  },
  contactSupport: (body) => {
    const errors = [];
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 1) {
      errors.push("Name is required");
    }
    if (!body.email || !isValidEmail(body.email)) {
      errors.push("Valid email is required");
    }
    if (!body.message || typeof body.message !== "string" || body.message.trim().length < 5) {
      errors.push("Message must be at least 5 characters");
    }
    return errors;
  },
};

export const validate = (schema) => {
  if (!validators[schema]) {
    return (req, res) => res.status(500).json({ message: "Unknown validation schema" });
  }
  return (req, res, next) => {
    const errors = validators[schema](req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }
    next();
  };
};
