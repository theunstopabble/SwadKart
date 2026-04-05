// frontend/src/config.js

// Using relative URLs for both local and production.
// Local dev: Vite proxy forwards /api to localhost:8000
// Production: Vercel rewrites forward /api to Render backend
export const BASE_URL = import.meta.env.VITE_API_URL || "";
