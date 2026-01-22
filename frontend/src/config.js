// frontend/src/config.js
export const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000"
    : import.meta.env.VITE_API_URL || "https://swadkart-5wtf.onrender.com";
