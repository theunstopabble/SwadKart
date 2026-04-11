import { io } from "socket.io-client";

// SOCKET-01 FIX: Socket.io MUST always connect directly to Render.
// Vercel is serverless — persistent WebSocket connections CANNOT go
// through Vercel proxy. VITE_API_URL is intentionally empty for REST
// API cookie fix, but Socket.io needs a dedicated direct URL.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://swadkart-5wtf.onrender.com";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};