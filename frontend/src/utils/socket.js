import { io } from "socket.io-client";
import { BASE_URL } from "../config";

let socket = null;

export const getSocket = () => {
  if (!socket || socket.disconnected) {
    socket = io(BASE_URL, {
      autoConnect: true,
      transports: ["websocket"],
      withCredentials: true,
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