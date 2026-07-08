import crypto from "node:crypto";
import { findActiveSearches } from "../models/lost-pet-search.model.js";
import { findPetById } from "../models/pet.model.js";
import { haversineDistanceMiles } from "./geo.service.js";
import { redis } from "../config/redis.js";
import { dispatchBOLO, dispatchCommunityAlert } from "./notification.service.js";

const BOLO_RADIUS_MILES = 5;
const COMMUNITY_RADIUS_MILES = 5;
const DEDUPE_TTL_SECONDS = 60 * 30;

async function alreadyNotified(userId: string, searchId: string, type: string): Promise<boolean> {
  const key = `notif_dedup:${userId}:${searchId}:${type}`;
  const result = await redis.set(key, "1", "EX", DEDUPE_TTL_SECONDS, "NX");
  // SET ... NX returns null if the key already existed (i.e. already notified recently)
  return result === null;
}

export async function evaluateLocationUpdate(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  // One trace ID per location update so every search evaluated (skip, dedupe
  // hit, or dispatch) against this single GPS ping can be correlated in logs.
  const traceId = crypto.randomUUID();
  const activeSearches = await findActiveSearches();
  console.log(
    `[community-alert] trace=${traceId} user=${userId} evaluating ${activeSearches.length} active search(es)`
  );

  for (const search of activeSearches) {
    if (search.owner_id === userId) continue;

    const distance = haversineDistanceMiles(search.center_lat, search.center_lng, lat, lng);
    if (distance > COMMUNITY_RADIUS_MILES) continue;

    const pet = await findPetById(search.pet_id);
    if (!pet) continue;

    const type = distance <= BOLO_RADIUS_MILES ? "bolo_alert" : "community_alert";
    if (await alreadyNotified(userId, search.id, type)) {
      console.log(`[community-alert] trace=${traceId} search=${search.id} type=${type} skipped (dedupe window active)`);
      continue;
    }

    console.log(
      `[community-alert] trace=${traceId} search=${search.id} type=${type} distance_miles=${distance.toFixed(2)} dispatching`
    );

    if (distance <= BOLO_RADIUS_MILES) {
      await dispatchBOLO(userId, pet, distance, { lat, lng });
    } else {
      await dispatchCommunityAlert(userId, pet, distance, { lat, lng });
    }
  }
}
