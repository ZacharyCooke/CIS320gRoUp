import { env } from "../config/env.js";

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
  species?: string
): Promise<PetFinderResult[]> {
  if (!env.PETFINDER_API_KEY || !env.PETFINDER_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] PetFinder credentials not set — returning empty results");
    }
    return [];
  }

  const token = await getAccessToken();
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    distance: String(Math.min(Math.ceil(radiusMiles), 500)),
    limit: "50",
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

  return data.animals.map((a) => ({
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
}
