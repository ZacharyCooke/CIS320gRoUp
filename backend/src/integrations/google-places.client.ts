import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env.js";

const client = new Client({});
const METERS_PER_MILE = 1609.34;

export interface VetClinic {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
}

/**
 * Finds veterinary clinics within a radius using Google Places Nearby Search.
 * Note: the Places API never returns a business email address — callers must
 * source clinic_email from another record (e.g. the pet's own registered vet)
 * when one is available.
 */
export async function findNearbyVetClinics(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<VetClinic[]> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    console.log("[dev] GOOGLE_MAPS_API_KEY not set — no vet clinics discovered");
    return [];
  }

  try {
    const nearby = await client.placesNearby({
      params: {
        location: { lat, lng },
        radius: Math.round(radiusMiles * METERS_PER_MILE),
        type: "veterinary_care",
        key: env.GOOGLE_MAPS_API_KEY
      }
    });

    const clinics = await Promise.all(
      nearby.data.results.slice(0, 20).map(async (place) => {
        if (!place.place_id || !place.geometry?.location) return null;

        let phone: string | null = null;
        try {
          const details = await client.placeDetails({
            params: {
              place_id: place.place_id,
              fields: ["formatted_phone_number"],
              key: env.GOOGLE_MAPS_API_KEY!
            }
          });
          phone = details.data.result.formatted_phone_number ?? null;
        } catch (err) {
          console.error("[vet-discovery] place details error:", err);
        }

        const clinic: VetClinic = {
          placeId: place.place_id,
          name: place.name ?? "Unknown Clinic",
          address: place.vicinity ?? null,
          phone,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        };
        return clinic;
      })
    );

    return clinics.filter((c): c is VetClinic => c !== null);
  } catch (err) {
    console.error("[vet-discovery] nearby search error:", err);
    return [];
  }
}
