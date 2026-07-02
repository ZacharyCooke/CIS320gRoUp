import { searchPetFinder } from "../integrations/petfinder.client.js";
import { emitNewResult, emitSearchComplete } from "../integrations/websocket.server.js";
import { createSearchResult } from "../models/search-result.model.js";
import type { LostPetSearch } from "../models/lost-pet-search.model.js";
import { haversineDistanceMiles } from "./geo.service.js";

export async function runSearch(search: LostPetSearch, species?: string): Promise<void> {
  const { id: searchId, center_lat: lat, center_lng: lng, radius_miles: radius } = search;

  const results = await Promise.allSettled([
    runPetFinderSource(searchId, lat, lng, radius, species)
  ]);

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
