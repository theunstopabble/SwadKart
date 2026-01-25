// frontend/src/config.js
// export const BASE_URL =
//   import.meta.env.MODE === "development"
//     ? "http://localhost:8000"
//     : import.meta.env.VITE_API_URL || "https://swadkart-5wtf.onrender.com";



// Agar .env me URL hai (DevTunnel wala) to wo use karo, nahi to localhost (fallback)
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Note: Ensure karna ki tumhare frontend/.env me VITE_API_URL sahi DevTunnel link ho.