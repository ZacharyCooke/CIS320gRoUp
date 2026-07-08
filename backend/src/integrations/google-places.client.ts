import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { haversineDistanceMiles } from "../services/geo.service.js";

const DEFAULT_BOLO_RADIUS_MILES = 5;
const GOOGLE_NEARBY_MAX_RADIUS_METERS = 50_000;
const DISCOVERY_CACHE_TTL_SECONDS = 60 * 60 * 24;

const client = new Client({});

export type BoloProviderCategory = "vet" | "shelter" | "rescue";

export interface NearbyVetClinic {
  clinic_name: string;
  clinic_address: string | null;
  provider_category?: BoloProviderCategory;
  /**
   * Google Places has no email field for a business listing. This is always
   * null from live Places data; a future provider directory can populate it.
   */
  clinic_email: string | null;
  latitude: number;
  longitude: number;
  distance_miles: number;
}

interface PlacesDiscoveryQuery {
  provider_category: BoloProviderCategory;
  type?: "veterinary_care" | "animal_shelter";
  keyword?: string;
}

const DISCOVERY_QUERIES: PlacesDiscoveryQuery[] = [
  { provider_category: "vet", type: "veterinary_care" },
  { provider_category: "shelter", type: "animal_shelter" },
  { provider_category: "rescue", keyword: "animal rescue" }
];

const DEV_BOLO_PROVIDERS: NearbyVetClinic[] = [
  {
    clinic_name: "Harbor Paws Veterinary",
    clinic_address: "Demo provider near downtown San Diego",
    provider_category: "vet",
    clinic_email: "harbor-paws@example.test",
    latitude: 32.719,
    longitude: -117.159,
    distance_miles: 0
  },
  {
    clinic_name: "Balboa Animal Shelter",
    clinic_address: "Demo provider near Balboa Park",
    provider_category: "shelter",
    clinic_email: "balboa-shelter@example.test",
    latitude: 32.735,
    longitude: -117.146,
    distance_miles: 0
  },
  {
    clinic_name: "Mission Valley Pet Rescue",
    clinic_address: "Demo provider in Mission Valley",
    provider_category: "rescue",
    clinic_email: "mission-rescue@example.test",
    latitude: 32.771,
    longitude: -117.158,
    distance_miles: 0
  },
  {
    clinic_name: "Alpine Creek Veterinary",
    clinic_address: "Demo provider near the shifted search point",
    provider_category: "vet",
    clinic_email: "alpine-vet@example.test",
    latitude: 32.719,
    longitude: -116.735,
    distance_miles: 0
  }
];

function cacheKey(lat: number, lng: number, radiusMiles: number): string {
  return `animal_care_discovery:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusMiles.toFixed(1)}`;
}

export async function findNearbyVetClinics(
  lat: number,
  lng: number,
  radiusMiles = DEFAULT_BOLO_RADIUS_MILES
): Promise<NearbyVetClinic[]> {
  return findNearbyAnimalCareProviders(lat, lng, radiusMiles);
}

export async function findNearbyAnimalCareProviders(
  lat: number,
  lng: number,
  radiusMiles = DEFAULT_BOLO_RADIUS_MILES
): Promise<NearbyVetClinic[]> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] Google Places credentials not set - returning no BOLO providers");
    }
    if (env.NODE_ENV === "development") {
      return fromDevCatalog(lat, lng, radiusMiles);
    }
    return [];
  }

  const key = cacheKey(lat, lng, radiusMiles);
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as NearbyVetClinic[];
  } catch (err) {
    console.error("[google-places] cache read error:", err);
  }

  let providers: NearbyVetClinic[] = [];
  try {
    providers = await fetchNearbyAnimalCareProviders(lat, lng, radiusMiles);
  } catch (err) {
    console.error("[google-places] Nearby Search error:", err);
    return [];
  }

  try {
    await redis.set(key, JSON.stringify(providers), "EX", DISCOVERY_CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("[google-places] cache write error:", err);
  }

  return providers;
}

function fromDevCatalog(lat: number, lng: number, radiusMiles: number): NearbyVetClinic[] {
  return DEV_BOLO_PROVIDERS
    .map((provider) => ({
      ...provider,
      distance_miles: haversineDistanceMiles(lat, lng, provider.latitude, provider.longitude)
    }))
    .filter((provider) => provider.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles);
}

async function fetchNearbyAnimalCareProviders(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<NearbyVetClinic[]> {
  const radiusMeters = Math.min(
    Math.round(radiusMiles * 1609.34),
    GOOGLE_NEARBY_MAX_RADIUS_METERS
  );

  const nearbyResponses = await Promise.all(
    DISCOVERY_QUERIES.map((query) =>
      client.placesNearby({
        params: {
          location: { lat, lng },
          radius: radiusMeters,
          type: query.type,
          keyword: query.keyword,
          key: env.GOOGLE_MAPS_API_KEY!
        }
      }).then((response) =>
        response.data.results.map((place) => ({
          place,
          provider_category: query.provider_category
        }))
      )
    )
  );

  const seen = new Set<string>();
  const placeCandidates = nearbyResponses
    .flat()
    .filter(({ place }) => {
      const id = place.place_id ?? `${place.name ?? ""}:${place.vicinity ?? ""}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

  const providers = await Promise.allSettled(
    placeCandidates.map(({ place, provider_category }) =>
      toNearbyProvider(place, lat, lng, provider_category)
    )
  );

  return providers
    .filter(
      (r): r is PromiseFulfilledResult<NearbyVetClinic | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((provider): provider is NearbyVetClinic => provider !== null)
    .filter((provider) => provider.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles);
}

async function toNearbyProvider(
  place: {
    place_id?: string;
    name?: string;
    vicinity?: string;
    geometry?: { location?: { lat: number; lng: number } };
  },
  centerLat: number,
  centerLng: number,
  providerCategory: BoloProviderCategory
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
    provider_category: providerCategory,
    clinic_email: null,
    latitude: location.lat,
    longitude: location.lng,
    distance_miles: haversineDistanceMiles(centerLat, centerLng, location.lat, location.lng)
  };
}
