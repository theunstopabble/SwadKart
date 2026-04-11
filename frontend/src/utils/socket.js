import { io } from "socket.io-client";
import { BASEURL } from "../config";

let socket = null;

export const getSocket = () => {
  if (!socket || socket.disconnected) {
    socket = io(BASEURL, {
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
