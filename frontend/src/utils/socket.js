import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://swadkart-5wtf.onrender.com";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // Server force-closed, need to reconnect manually
        socket.connect();
      }
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