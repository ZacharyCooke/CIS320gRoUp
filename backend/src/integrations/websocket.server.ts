import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { env } from "../config/env.js";
import { findActiveSearches, type LostPetSearch } from "../models/lost-pet-search.model.js";
import { findPetById } from "../models/pet.model.js";
import { haversineDistanceMiles } from "../services/geo.service.js";
import { dispatchBOLO, dispatchCommunityAlert } from "../services/notification.service.js";

let io: SocketServer | null = null;

const BOLO_RADIUS_MILES = 1;
const COMMUNITY_RADIUS_MILES = 2;

interface TrackedLocation {
  lat: number;
  lng: number;
  alertedSearchIds: Set<string>;
}

// In-memory only — location is never persisted, per FR-031. Used solely to
// evaluate BOLO/community proximity thresholds for currently-connected users.
const connectedLocations = new Map<string, TrackedLocation>();

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });

  io.on("connection", (socket) => {
    const { searchId, userId } = socket.handshake.query;
    if (typeof searchId === "string") socket.join(`search:${searchId}`);
    if (typeof userId === "string") socket.join(`user:${userId}`);

    socket.on("update_location", (data: { latitude?: number; longitude?: number }) => {
      if (typeof userId !== "string" || typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
        return;
      }
      const tracked = connectedLocations.get(userId) ?? { lat: 0, lng: 0, alertedSearchIds: new Set<string>() };
      tracked.lat = data.latitude;
      tracked.lng = data.longitude;
      connectedLocations.set(userId, tracked);

      evaluateBoloThreshold(userId, tracked).catch((err) =>
        console.error("[websocket] BOLO evaluation error:", err)
      );
    });

    socket.on("disconnect", () => {
      if (typeof userId === "string") connectedLocations.delete(userId);
    });
  });

  return io;
}

async function evaluateBoloThreshold(userId: string, location: TrackedLocation): Promise<void> {
  const activeSearches = await findActiveSearches();

  for (const search of activeSearches) {
    if (search.owner_id === userId || location.alertedSearchIds.has(search.id)) continue;

    const distance = haversineDistanceMiles(location.lat, location.lng, search.center_lat, search.center_lng);
    if (distance > BOLO_RADIUS_MILES) continue;

    location.alertedSearchIds.add(search.id);
    const pet = await findPetById(search.pet_id);
    if (!pet) continue;

    await dispatchBOLO(userId, pet.name, pet.breed, pet.color, distance, location.lat, location.lng);
  }
}

/** Green community alert — broadcast once to all currently-connected nearby users when a pet is newly marked lost. */
export async function notifyNearbyUsersOfNewLostSearch(search: LostPetSearch): Promise<void> {
  const pet = await findPetById(search.pet_id);
  if (!pet) return;

  for (const [userId, location] of connectedLocations) {
    if (userId === search.owner_id) continue;
    const distance = haversineDistanceMiles(location.lat, location.lng, search.center_lat, search.center_lng);
    if (distance > COMMUNITY_RADIUS_MILES) continue;

    await dispatchCommunityAlert(userId, pet.name, pet.species, pet.color, distance, location.lat, location.lng);
  }
}

export function emitNewResult(searchId: string, result: object): void {
  io?.to(`search:${searchId}`).emit("new_result", result);
}

export function emitSearchComplete(searchId: string): void {
  io?.to(`search:${searchId}`).emit("search_complete", { search_id: searchId });
}

export function emitVetBoloSent(searchId: string, data: { clinic_name: string; email_status: string }): void {
  io?.to(`search:${searchId}`).emit("vet_bolo_sent", data);
}
