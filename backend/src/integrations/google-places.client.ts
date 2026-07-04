import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { haversineDistanceMiles } from "../services/geo.service.js";

const VET_BOLO_RADIUS_MILES = 2;
const VET_BOLO_RADIUS_METERS = Math.round(VET_BOLO_RADIUS_MILES * 1609.34);
const VET_DISCOVERY_CACHE_TTL_SECONDS = 60 * 60 * 24;

const client = new Client({});

export interface NearbyVetClinic {
  clinic_name: string;
  clinic_address: string | null;
  /**
   * Google Places has no email field for a business listing — only phone/website are ever
   * available. This is always null from live Places data; kept on the shape so a matched
   * PetVet record (or future data source) could populate it without a contract change.
   */
  clinic_email: string | null;
  latitude: number;
  longitude: number;
  distance_miles: number;
}

function cacheKey(lat: number, lng: number): string {
  return `vet_discovery:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export async function findNearbyVetClinics(
  lat: number,
  lng: number
): Promise<NearbyVetClinic[]> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] Google Places credentials not set — returning no vet clinics");
    }
    return [];
  }

  const key = cacheKey(lat, lng);
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as NearbyVetClinic[];
  } catch (err) {
    console.error("[google-places] cache read error:", err);
  }

  let clinics: NearbyVetClinic[] = [];
  try {
    clinics = await fetchNearbyVetClinics(lat, lng);
  } catch (err) {
    console.error("[google-places] Nearby Search error:", err);
    return [];
  }

  try {
    await redis.set(key, JSON.stringify(clinics), "EX", VET_DISCOVERY_CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("[google-places] cache write error:", err);
  }

  return clinics;
}

async function fetchNearbyVetClinics(lat: number, lng: number): Promise<NearbyVetClinic[]> {
  const nearby = await client.placesNearby({
    params: {
      location: { lat, lng },
      radius: VET_BOLO_RADIUS_METERS,
      type: "veterinary_care",
      key: env.GOOGLE_MAPS_API_KEY!
    }
  });

  const clinics = await Promise.allSettled(
    nearby.data.results.map((place) => toNearbyVetClinic(place, lat, lng))
  );

  return clinics
    .filter(
      (r): r is PromiseFulfilledResult<NearbyVetClinic | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((clinic): clinic is NearbyVetClinic => clinic !== null)
    .filter((clinic) => clinic.distance_miles <= VET_BOLO_RADIUS_MILES);
}

async function toNearbyVetClinic(
  place: { place_id?: string; name?: string; vicinity?: string; geometry?: { location?: { lat: number; lng: number } } },
  centerLat: number,
  centerLng: number
): Promise<NearbyVetClinic | null> {
  const location = place.geometry?.location;
  if (!place.place_id || !place.name || !location) return null;

  let address = place.vicinity ?? null;
  try {
    const details = await client.placeDetails({
      params: {
        place_id: place.place_id,
        fields: ["formatted_address"],
        key: env.GOOGLE_MAPS_API_KEY!
      }
    });
    address = details.data.result.formatted_address ?? address;
  } catch (err) {
    console.error("[google-places] Place Details error:", err);
  }

  return {
    clinic_name: place.name,
    clinic_address: address,
    clinic_email: null,
    latitude: location.lat,
    longitude: location.lng,
    distance_miles: haversineDistanceMiles(centerLat, centerLng, location.lat, location.lng)
  };
}
