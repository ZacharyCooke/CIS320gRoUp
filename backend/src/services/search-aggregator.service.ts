import { searchPetFinder } from "../integrations/petfinder.client.js";
import { emitNewResult, emitSearchComplete } from "../integrations/websocket.server.js";
import { createSearchResult } from "../models/search-result.model.js";
import type { LostPetSearch } from "../models/lost-pet-search.model.js";
import { haversineDistanceMiles } from "./geo.service.js";
import { findUserById } from "../models/user.model.js";
import { findExternalSourcesByOwnerId } from "../models/external-source.model.js";
import { findFacebookGroupMatches } from "./facebook-groups.service.js";
import { findTrackingDevicesByPetId } from "../models/tracking-device.model.js";
import { isWithinRadius } from "./geo.service.js";
import type { Pet } from "../models/pet.model.js";

type SearchPet = Pick<Pet, "id" | "name" | "species" | "color" | "breed">;

export async function runSearch(search: LostPetSearch, pet?: SearchPet): Promise<void> {
  const { id: searchId, owner_id: ownerId, center_lat: lat, center_lng: lng, radius_miles: radius } = search;

  const results = await Promise.allSettled([
    runPetFinderSource(searchId, lat, lng, radius, pet?.species),
    runFacebookGroupsSource(searchId, ownerId, pet),
    runTrackingDeviceSource(searchId, lat, lng, radius, pet)
  ]);

  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("[search-aggregator] source error:", r.reason);
    }
  });

  emitSearchComplete(searchId);
}

async function runFacebookGroupsSource(searchId: string, ownerId: string, pet?: SearchPet): Promise<void> {
  if (!pet) return;

  const [owner, sources] = await Promise.all([findUserById(ownerId), findExternalSourcesByOwnerId(ownerId)]);
  if (!owner?.facebook_access_token_encrypted) return;
  if (!sources.some((s) => s.source_type === "facebook_groups")) return;

  const matches = await findFacebookGroupMatches(owner.facebook_access_token_encrypted, [
    pet.species,
    pet.color,
    pet.breed
  ]);

  for (const match of matches) {
    const result = await createSearchResult({
      search_id: searchId,
      source: "facebook_groups",
      external_id: match.external_id,
      name: match.name,
      description: match.description,
      photo_url: match.photo_url,
      source_url: match.source_url,
      found_at: match.found_at
    });
    emitNewResult(searchId, result);
  }
}

async function runPetFinderSource(
  searchId: string,
  lat: number,
  lng: number,
  radius: number,
  species?: string
): Promise<void> {
  const animals = await searchPetFinder(lat, lng, radius, species);

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

/** FR-011 — a pet's own linked tracking devices are queried alongside every other source. */
async function runTrackingDeviceSource(
  searchId: string,
  centerLat: number,
  centerLng: number,
  radius: number,
  pet?: SearchPet
): Promise<void> {
  if (!pet) return;

  const devices = await findTrackingDevicesByPetId(pet.id);
  for (const device of devices) {
    if (device.last_known_latitude == null || device.last_known_longitude == null) continue;

    const deviceLat = parseFloat(device.last_known_latitude);
    const deviceLng = parseFloat(device.last_known_longitude);
    if (!isWithinRadius(centerLat, centerLng, radius, deviceLat, deviceLng)) continue;

    await addTrackingDeviceResult(searchId, centerLat, centerLng, deviceLat, deviceLng, pet.name);
  }
}

async function addTrackingDeviceResult(
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
