import crypto from "node:crypto";
import { findActiveSearches } from "../models/lost-pet-search.model.js";
import { findPetById } from "../models/pet.model.js";
import { boundingBox, haversineDistanceMiles } from "./geo.service.js";
import { redis } from "../config/redis.js";
import { dispatchBOLO, dispatchCommunityAlert, dispatchFoundNearbyAlert } from "./notification.service.js";
import { findRecentFoundReportsInBounds } from "../models/found-report.model.js";

const BOLO_RADIUS_MILES = 5;
const COMMUNITY_RADIUS_MILES = 5;
const FOUND_REPORT_RADIUS_MILES = 5;
const FOUND_REPORT_RECENCY_HOURS = 24;
const DEDUPE_TTL_SECONDS = 60 * 30;

async function alreadyNotified(userId: string, subjectId: string, type: string): Promise<boolean> {
  const key = `notif_dedup:${userId}:${subjectId}:${type}`;
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

  const box = boundingBox(lat, lng, FOUND_REPORT_RADIUS_MILES);
  const nearbyReports = await findRecentFoundReportsInBounds(
    box.minLat, box.maxLat, box.minLng, box.maxLng, FOUND_REPORT_RECENCY_HOURS
  );
  console.log(
    `[community-alert] trace=${traceId} user=${userId} evaluating ${nearbyReports.length} recent found report(s)`
  );

  for (const report of nearbyReports) {
    const distance = haversineDistanceMiles(report.lat, report.lng, lat, lng);
    if (distance > FOUND_REPORT_RADIUS_MILES) continue;

    if (await alreadyNotified(userId, report.id, "nearby_found")) {
      console.log(`[community-alert] trace=${traceId} report=${report.id} type=nearby_found skipped (dedupe window active)`);
      continue;
    }

    console.log(
      `[community-alert] trace=${traceId} report=${report.id} type=nearby_found distance_miles=${distance.toFixed(2)} dispatching`
    );
    await dispatchFoundNearbyAlert(userId, report, distance, { lat, lng });
  }
}
