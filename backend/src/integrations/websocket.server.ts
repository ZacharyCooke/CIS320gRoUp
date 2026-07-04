import type { Server as HttpServer } from "node:http";
import { Server as SocketServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { evaluateLocationUpdate } from "../services/community-alert.service.js";

let io: SocketServer | null = null;

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

function verifySocketUserId(socket: Socket): string | null {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string" || !token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });

  io.on("connection", (socket) => {
    const { searchId } = socket.handshake.query;
    if (typeof searchId === "string") socket.join(`search:${searchId}`);

    // userId room membership is derived from a verified JWT, never the raw
    // handshake query — a client can no longer join another user's room by
    // guessing their id.
    const userId = verifySocketUserId(socket);
    if (userId) socket.join(`user:${userId}`);

    socket.on("update_location", (payload: unknown) => {
      if (!userId) return;
      const parsed = updateLocationSchema.safeParse(payload);
      if (!parsed.success) return;
      evaluateLocationUpdate(userId, parsed.data.latitude, parsed.data.longitude).catch((err) =>
        console.error("[websocket] update_location error:", err)
      );
    });
  });

  return io;
}

export function emitNewResult(searchId: string, result: object): void {
  io?.to(`search:${searchId}`).emit("new_result", result);
}

export function emitSearchComplete(searchId: string): void {
  io?.to(`search:${searchId}`).emit("search_complete", { search_id: searchId });
}

export function emitVetBoloSent(
  searchId: string,
  data: { clinic_name: string; email_status: string }
): void {
  io?.to(`search:${searchId}`).emit("vet_bolo_sent", data);
}

export function emitNotification(userId: string, event: string, payload: object): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function getIO(): SocketServer | null {
  return io;
}
