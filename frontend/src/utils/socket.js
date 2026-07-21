import { io } from "socket.io-client";

const DEV = import.meta.env.DEV || location.hostname === "localhost";
const SOCKET_URL = DEV
  ? "http://localhost:5000"
  : import.meta.env.VITE_SOCKET_URL || "https://swadkart-5wtf.onrender.com";

let socket = null;

const createSocket = () => {
  const token = localStorage.getItem("jwt");

  const newSocket = io(SOCKET_URL, {
    withCredentials: true,
    auth: token ? { token } : undefined,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  newSocket.on("connect_error", (err) => {
    console.warn("Socket connect error:", err.message);
  });

  newSocket.on("disconnect", (reason) => {
    // Only reconnect on server disconnect if we still have a valid token
    if (reason === "io server disconnect") {
      const token = localStorage.getItem("jwt");
      if (token) {
        newSocket.connect();
      }
    }
  });

  return newSocket;
};

export const getSocket = () => {
  if (!socket) {
    socket = createSocket();
  } else {
    // Refresh auth token if it changed since socket was created
    const currentToken = socket.auth?.token;
    const storedToken = localStorage.getItem("jwt");
    if (storedToken !== currentToken) {
      socket.auth = storedToken ? { token: storedToken } : {};
      if (socket.connected) {
        try {
          socket.disconnect().connect();
        } catch (e) {
          console.warn("Socket reconnect failed:", e.message);
        }
      }
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
