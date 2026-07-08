import { findNearbyVetClinics, type NearbyVetClinic } from "../integrations/google-places.client.js";
import { haversineDistanceMiles } from "../services/geo.service.js";

interface Args {
  lat: number;
  lng: number;
  radius: number;
  mock: boolean;
}

const MOCK_PROVIDERS: NearbyVetClinic[] = [
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
  },
  {
    clinic_name: "East County Animal Shelter",
    clinic_address: "Demo provider near the shifted search point",
    provider_category: "shelter",
    clinic_email: "east-shelter@example.test",
    latitude: 32.807,
    longitude: -116.918,
    distance_miles: 0
  },
  {
    clinic_name: "Too Far North Rescue",
    clinic_address: "Demo provider outside a 5 mile radius",
    provider_category: "rescue",
    clinic_email: "too-far@example.test",
    latitude: 33.25,
    longitude: -117.16,
    distance_miles: 0
  }
];

function parseArgs(): Args {
  const args = new Map<string, string | boolean>();
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === "--mock") {
      args.set("mock", true);
      continue;
    }
    if (arg.startsWith("--")) {
      args.set(arg.slice(2), process.argv[i + 1]);
      i += 1;
    }
  }

  const lat = Number(args.get("lat"));
  const lng = Number(args.get("lng"));
  const radius = Number(args.get("radius") ?? 5);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
    throw new Error("Usage: tsx src/scripts/audit-bolo.ts --lat 32.7157 --lng -117.1611 --radius 5 [--mock]");
  }

  return { lat, lng, radius, mock: args.get("mock") === true };
}

function fromMockCatalog(lat: number, lng: number, radius: number): NearbyVetClinic[] {
  return MOCK_PROVIDERS
    .map((provider) => ({
      ...provider,
      distance_miles: haversineDistanceMiles(lat, lng, provider.latitude, provider.longitude)
    }))
    .filter((provider) => provider.distance_miles <= radius)
    .sort((a, b) => a.distance_miles - b.distance_miles);
}

const args = parseArgs();
const providers = args.mock
  ? fromMockCatalog(args.lat, args.lng, args.radius)
  : await findNearbyVetClinics(args.lat, args.lng, args.radius);

console.log(JSON.stringify({
  mode: args.mock ? "mock" : "live_google_places",
  center: { lat: args.lat, lng: args.lng },
  radius_miles: args.radius,
  provider_count: providers.length,
  providers: providers.map((provider) => ({
    name: provider.clinic_name,
    category: provider.provider_category ?? "vet",
    address: provider.clinic_address,
    email: provider.clinic_email,
    lat: provider.latitude,
    lng: provider.longitude,
    distance_miles: Number(provider.distance_miles.toFixed(2))
  }))
}, null, 2));
