import { createHash } from "node:crypto";

const EARTH_RADIUS_MILES = 3958.8;
const EARTH_RADIUS_FEET = EARTH_RADIUS_MILES * 5280;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Cheap bounding-box pre-filter before running the full Haversine check. */
export function boundingBox(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMiles / EARTH_RADIUS_MILES * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos(toRad(centerLat));
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta
  };
}

// Obscures an exact point for public display: derives a pseudo-random point
// uniformly distributed within radiusFeet of (lat, lng), seeded by seedKey so
// the same seed always yields the same fuzzed point (stable across repeated
// requests for the same record) without persisting a separate fuzzed value.
// Callers must use a stable per-record seed (e.g. a search id) - never the
// coordinates themselves, which would make the offset invertible.
export function fuzzLocation(lat: number, lng: number, seedKey: string, radiusFeet: number): LatLng {
  const hash = createHash("sha256").update(seedKey).digest();
  const angle = (hash.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
  // sqrt() of a uniform [0,1) draw gives a uniform-in-area distribution
  // within the circle, rather than clustering points near the center.
  const distanceFeet = Math.sqrt(hash.readUInt32BE(4) / 0xffffffff) * radiusFeet;

  const dLatFeet = distanceFeet * Math.cos(angle);
  const dLngFeet = distanceFeet * Math.sin(angle);
  const dLat = (dLatFeet / EARTH_RADIUS_FEET) * (180 / Math.PI);
  const dLng = (dLngFeet / (EARTH_RADIUS_FEET * Math.cos(toRad(lat)))) * (180 / Math.PI);

  return { lat: lat + dLat, lng: lng + dLng };
}

export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  pointLat: number,
  pointLng: number
): boolean {
  return haversineDistanceMiles(centerLat, centerLng, pointLat, pointLng) <= radiusMiles;
}
