import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

interface PetFinderTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

interface PetFinderAnimal {
  id: number;
  name: string;
  species: string;
  breeds: { primary: string | null };
  colors: { primary: string | null };
  description: string | null;
  photos: { medium: string }[];
  contact: {
    email: string | null;
    phone: string | null;
    address: { city: string | null; state: string | null };
  };
  url: string;
  published_at: string;
}

interface PetFinderSearchResponse {
  animals: PetFinderAnimal[];
}

export interface PetFinderResult {
  external_id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  description: string | null;
  contact_info: string | null;
  source_url: string;
  found_at: Date;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const PETFINDER_SEARCH_CACHE_TTL_SECONDS = 60 * 5;

function searchCacheKey(
  lat: number,
  lng: number,
  radiusMiles: number,
  species: string | undefined,
  limit: number
): string {
  return [
    "petfinder_search",
    lat.toFixed(3),
    lng.toFixed(3),
    Math.min(Math.ceil(radiusMiles), 500),
    species ?? "any",
    Math.min(Math.max(limit, 1), 100)
  ].join(":");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  if (!env.PETFINDER_API_KEY || !env.PETFINDER_SECRET) {
    throw new Error("PetFinder credentials not configured");
  }

  const resp = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.PETFINDER_API_KEY,
      client_secret: env.PETFINDER_SECRET
    })
  });

  if (!resp.ok) {
    throw new Error(`PetFinder token error: ${resp.status}`);
  }

  const data = (await resp.json()) as PetFinderTokenResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function searchPetFinder(
  lat: number,
  lng: number,
  radiusMiles: number,
  species?: string,
  limit = 50
): Promise<PetFinderResult[]> {
  if (!env.PETFINDER_API_KEY || !env.PETFINDER_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] PetFinder credentials not set — returning empty results");
    }
    return [];
  }

  const key = searchCacheKey(lat, lng, radiusMiles, species, limit);
  try {
    const cached = await redis.get(key);
    if (cached) {
      return (JSON.parse(cached) as Array<Omit<PetFinderResult, "found_at"> & { found_at: string }>).map((result) => ({
        ...result,
        found_at: new Date(result.found_at)
      }));
    }
  } catch (err) {
    console.error("[petfinder] cache read error:", err);
  }

  const token = await getAccessToken();
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    distance: String(Math.min(Math.ceil(radiusMiles), 500)),
    limit: String(Math.min(Math.max(limit, 1), 100)),
    status: "adoptable"
  });
  if (species) params.set("type", species);

  const resp = await fetch(`https://api.petfinder.com/v2/animals?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!resp.ok) {
    throw new Error(`PetFinder search error: ${resp.status}`);
  }

  const data = (await resp.json()) as PetFinderSearchResponse;

  const results = data.animals.map((a) => ({
    external_id: String(a.id),
    name: a.name,
    species: a.species,
    breed: a.breeds.primary ?? null,
    color: a.colors.primary ?? null,
    photo_url: a.photos[0]?.medium ?? null,
    description: a.description ?? null,
    contact_info: [a.contact.email, a.contact.phone].filter(Boolean).join(" | ") || null,
    source_url: a.url,
    found_at: new Date(a.published_at)
  }));

  try {
    await redis.set(key, JSON.stringify(results), "EX", PETFINDER_SEARCH_CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("[petfinder] cache write error:", err);
  }

  return results;
}
