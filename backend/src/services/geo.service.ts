const EARTH_RADIUS_MILES = 3958.8;

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

export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  pointLat: number,
  pointLng: number
): boolean {
  return haversineDistanceMiles(centerLat, centerLng, pointLat, pointLng) <= radiusMiles;
}
