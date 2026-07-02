import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { env } from "../config/env.js";

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });

  io.on("connection", (socket) => {
    const { searchId, userId } = socket.handshake.query;
    if (typeof searchId === "string") socket.join(`search:${searchId}`);
    if (typeof userId === "string") socket.join(`user:${userId}`);
  });

  return io;
}

export function emitNewResult(searchId: string, result: object): void {
  io?.to(`search:${searchId}`).emit("new_result", result);
}

export function emitSearchComplete(searchId: string): void {
  io?.to(`search:${searchId}`).emit("search_complete", { search_id: searchId });
}

export function getIO(): SocketServer | null {
  return io;
}
