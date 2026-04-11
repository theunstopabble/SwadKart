// ADMIN-01 FIX: Renamed BASE_URL → BASEURL to match all component imports across the app
// VITE_API_URL is already set in Vercel environment variables.
// Local dev uses "" fallback so Vite proxy handles /api → localhost:8000
export const BASEURL = import.meta.env.VITE_API_URL || '';
export const BASE_URL = import.meta.env.VITE_API_URL || '';
