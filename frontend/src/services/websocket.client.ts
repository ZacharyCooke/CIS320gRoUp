import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api-client";

const WS_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:3000";

let socket: Socket | null = null;
let userSocket: Socket | null = null;

export function connectToSearch(searchId: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(WS_URL, {
    query: { searchId },
    transports: ["websocket"]
  });
  return socket;
}

export function disconnectSearch(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// User-room connection: identity is derived server-side from this JWT, not a
// client-supplied id — required for the recipient to receive their own
// bolo/community/claim notifications.
export function connectToUser(): Socket {
  if (userSocket) {
    userSocket.disconnect();
  }
  userSocket = io(WS_URL, {
    auth: { token: getAccessToken() },
    transports: ["websocket"]
  });
  return userSocket;
}

export function disconnectUser(): void {
  userSocket?.disconnect();
  userSocket = null;
}
