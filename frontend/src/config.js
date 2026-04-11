// SESSION-01 FIX: Added || '' fallback so local dev works without .env
// VITE_API_URL is set in Vercel. Empty string lets Vite proxy forward /api → localhost:8000
export const BASEURL = import.meta.env.VITE_API_URL || '';