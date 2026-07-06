import { io, type Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:3000";

let socket: Socket | null = null;

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
