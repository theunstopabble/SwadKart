import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://swadkart-5wtf.onrender.com";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem("jwt");

    socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
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
