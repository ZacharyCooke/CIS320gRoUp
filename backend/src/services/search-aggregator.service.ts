import { searchPetFinder } from "../integrations/petfinder.client.js";
import { emitNewResult, emitSearchComplete } from "../integrations/websocket.server.js";
import { createSearchResult } from "../models/search-result.model.js";
import type { LostPetSearch } from "../models/lost-pet-search.model.js";
import { findPetById } from "../models/pet.model.js";
import { findUserById } from "../models/user.model.js";
import { decryptSecret } from "../config/encryption.js";
import { fetchGroupPosts } from "./facebook-groups.service.js";
import { haversineDistanceMiles } from "./geo.service.js";

// Premium's "priority search" perk (User Story 7) — there's no job queue here
// to reorder (runSearch executes immediately via Promise.allSettled), so the
// real, minimal difference is a wider PetFinder result set for Premium
// subscribers rather than invented scheduling infrastructure.
const STANDARD_PETFINDER_LIMIT = 20;
const PREMIUM_PETFINDER_LIMIT = 100;

export async function runSearch(search: LostPetSearch, species?: string): Promise<void> {
  const { id: searchId, center_lat: lat, center_lng: lng, radius_miles: radius } = search;

  const owner = await findUserById(search.owner_id);
  const petfinderLimit = owner?.is_premium ? PREMIUM_PETFINDER_LIMIT : STANDARD_PETFINDER_LIMIT;

  const sources = [runPetFinderSource(searchId, lat, lng, radius, species, petfinderLimit)];

  // Facebook groups are opt-in — only attempted at all if the owner has
  // connected an account, never a no-op call for everyone else.
  if (owner?.facebook_access_token_encrypted) {
    sources.push(runFacebookGroupsSource(search, owner.facebook_access_token_encrypted));
  }

  const results = await Promise.allSettled(sources);

  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("[search-aggregator] source error:", r.reason);
    }
  });

  emitSearchComplete(searchId);
}

async function runPetFinderSource(
  searchId: string,
  lat: number,
  lng: number,
  radius: number,
  species?: string,
  limit?: number
): Promise<void> {
  const animals = await searchPetFinder(lat, lng, radius, species, limit);

  for (const animal of animals) {
    const result = await createSearchResult({
      search_id: searchId,
      source: "petfinder_api",
      external_id: animal.external_id,
      name: animal.name,
      species: animal.species,
      breed: animal.breed,
      color: animal.color,
      photo_url: animal.photo_url,
      description: animal.description,
      contact_info: animal.contact_info,
      source_url: animal.source_url,
      found_at: animal.found_at
    });

    emitNewResult(searchId, result);
  }
}

async function runFacebookGroupsSource(
  search: LostPetSearch,
  encryptedAccessToken: string
): Promise<void> {
  const pet = await findPetById(search.pet_id);
  if (!pet) return;

  const accessToken = decryptSecret(encryptedAccessToken);
  const matches = await fetchGroupPosts(accessToken, {
    species: pet.species,
    breed: pet.breed,
    color: pet.color
  });

  for (const match of matches) {
    const result = await createSearchResult({
      search_id: search.id,
      source: "facebook_groups",
      external_id: match.external_id,
      description: match.description,
      source_url: match.source_url,
      found_at: match.found_at
    });
    emitNewResult(search.id, result);
  }
}

export async function addTrackingDeviceResult(
  searchId: string,
  centerLat: number,
  centerLng: number,
  deviceLat: number,
  deviceLng: number,
  petName: string
): Promise<void> {
  const distance = haversineDistanceMiles(centerLat, centerLng, deviceLat, deviceLng);
  const result = await createSearchResult({
    search_id: searchId,
    source: "tracking_device",
    name: petName,
    lat: deviceLat,
    lng: deviceLng,
    distance_miles: distance
  });
  emitNewResult(searchId, result);
}
