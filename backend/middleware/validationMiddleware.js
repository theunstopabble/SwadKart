// Lightweight request validation middleware (zero external deps)
// Use for critical public endpoints that receive untrusted user input

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const validators = {
  register: (body) => {
    const errors = [];
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    if (!body.email || !EMAIL_REGEX.test(body.email)) {
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
    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      errors.push("Valid email is required");
    }
    if (!body.password || typeof body.password !== "string" || body.password.length < 1) {
      errors.push("Password is required");
    }
    return errors;
  },
  forgotPassword: (body) => {
    const errors = [];
    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      errors.push("Valid email is required");
    }
    return errors;
  },
  contactSupport: (body) => {
    const errors = [];
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 1) {
      errors.push("Name is required");
    }
    if (!body.email || !EMAIL_REGEX.test(body.email)) {
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
    throw new Error(`Unknown validation schema: ${schema}`);
  }
  return (req, res, next) => {
    const errors = validators[schema](req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }
    next();
  };
};
