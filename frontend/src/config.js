// frontend/src/config.js

// Using Vite's built-in env variables to detect if we are in production (Vercel) or local.
// If VITE_API_URL is explicitly set (like a dev tunnel), it uses that.
// If it's production, it uses the live Render backend.
// Otherwise, it falls back to localhost for local development.
export const BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === "production"
        ? "https://swadkart-5wtf.onrender.com"
        : "http://localhost:8000");