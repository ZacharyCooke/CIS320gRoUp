// One-off demo/UI-check seeder: creates 10 mock missing pets scattered around
// San Diego and drives them through the real HTTP API (register -> verify ->
// create pet -> mark lost -> vet/shelter/rescue BOLO dispatch -> tracking
// device pings -> a found-pet report from a "passerby"), then triggers the
// real community/BOLO/found-nearby notification pipeline so each owner ends
// up with realistic in-app notifications to look at.
//
// Run from backend/: npx tsx src/scripts/seed-demo-missing-pets.ts
import { pool, closeDatabase } from "../config/database.js";
import { evaluateLocationUpdate } from "../services/community-alert.service.js";

const API = "http://127.0.0.1:3000/api";

// Real San Diego neighborhood centers, each jittered a bit for natural spread.
const NEIGHBORHOODS = [
  { name: "Downtown/Gaslamp", lat: 32.7157, lng: -117.1611 },
  { name: "Balboa Park", lat: 32.7341, lng: -117.1449 },
  { name: "La Jolla", lat: 32.8328, lng: -117.2713 },
  { name: "Pacific Beach", lat: 32.7975, lng: -117.2358 },
  { name: "Mission Valley", lat: 32.7679, lng: -117.1671 },
  { name: "North Park", lat: 32.7407, lng: -117.1297 },
  { name: "Hillcrest", lat: 32.7483, lng: -117.1633 },
  { name: "Chula Vista", lat: 32.6401, lng: -117.0842 },
  { name: "Coronado", lat: 32.6859, lng: -117.1831 },
  { name: "Clairemont", lat: 32.8153, lng: -117.1922 }
];

const PETS = [
  { name: "Rex", species: "dog", breed: "Labrador Retriever", color: "Golden", size: "large", temperament: "friendly" },
  { name: "Whiskers", species: "cat", breed: "Tabby", color: "Gray", size: "medium", temperament: "cautious" },
  { name: "Charlie", species: "dog", breed: "Beagle", color: "Brown and White", size: "medium", temperament: "friendly" },
  { name: "Luna", species: "cat", breed: "Siamese", color: "Cream", size: "small", temperament: "report_only" },
  { name: "Max", species: "dog", breed: "German Shepherd", color: "Black and Tan", size: "large", temperament: "cautious" },
  { name: "Bella", species: "dog", breed: "Poodle", color: "White", size: "small", temperament: "friendly" },
  { name: "Tweety", species: "bird", breed: "Cockatiel", color: "Yellow", size: "small", temperament: "report_only" },
  { name: "Shadow", species: "cat", breed: "Domestic Shorthair", color: "Black", size: "medium", temperament: "cautious" },
  { name: "Cooper", species: "dog", breed: "Golden Retriever", color: "Golden", size: "large", temperament: "friendly" },
  { name: "Milo", species: "cat", breed: "Orange Tabby", color: "Orange", size: "medium", temperament: "friendly" }
];

const FINDER_NOTES = [
  "Saw this one hanging around the parking lot, looked hungry but let me get close.",
  "Spotted near the trail entrance around sunset, ran off when I approached.",
  "Was hiding under a parked car, has a collar but no visible tag.",
  "Wandering near the shops, seemed friendly and approached people.",
  "Saw it crossing the street, looked disoriented, didn't have a leash."
];

function jitter(deg: number): number {
  return (Math.random() - 0.5) * deg;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function postJson(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function postForm(path: string, fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${API}${path}`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

interface SeededPet {
  ownerId: string;
  ownerToken: string;
  petId: string;
  petName: string;
  searchId: string;
  lat: number;
  lng: number;
  neighborhood: string;
  vetBolosDispatched: number;
}

async function seedOnePet(index: number): Promise<SeededPet> {
  const pet = PETS[index];
  const home = NEIGHBORHOODS[index % NEIGHBORHOODS.length];
  const lat = home.lat + jitter(0.02);
  const lng = home.lng + jitter(0.02);
  const email = `demo_owner_${index}_${Date.now()}@example.com`;
  const password = "DemoPass12345!";

  const registerResp = await postJson("/auth/register", {
    first_name: `Owner${index + 1}`,
    last_name: "Demo",
    email,
    password
  });
  const otp = registerResp._dev_otp?.email;
  if (!otp) throw new Error(`No dev OTP returned for ${email}`);

  const verifyResp = await postJson("/auth/verify-contact", {
    user_id: registerResp.user_id,
    channel: "email",
    code: otp
  });
  const token = verifyResp.access_token as string;
  const ownerId = registerResp.user_id as string;

  const createResp = await postJson(
    "/pets",
    {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      size: pet.size,
      temperament: pet.temperament
    },
    token
  );
  const petId = createResp.pet.id as string;

  const markLostResp = await postJson(
    `/pets/${petId}/mark-lost`,
    { center_lat: lat, center_lng: lng, radius_miles: 10 },
    token
  );
  const searchId = markLostResp.search.id as string;

  console.log(
    `[${index + 1}/10] ${pet.name} (${pet.species}) lost near ${home.name} (${lat.toFixed(4)}, ${lng.toFixed(4)}) ` +
      `- ${markLostResp.vet_bolos_dispatched} BOLO provider(s) notified`
  );

  return {
    ownerId,
    ownerToken: token,
    petId,
    petName: pet.name,
    searchId,
    lat,
    lng,
    neighborhood: home.name,
    vetBolosDispatched: markLostResp.vet_bolos_dispatched
  };
}

async function addTrackingDeviceWithHits(seeded: SeededPet) {
  const deviceType = Math.random() < 0.5 ? "airtag" : "amazon_tag";
  const shareUrl = `https://find.example.test/${deviceType}/${seeded.petId.slice(0, 8)}`;
  const initialLat = seeded.lat + jitter(0.01);
  const initialLng = seeded.lng + jitter(0.01);

  const linkResp = await postJson(
    `/pets/${seeded.petId}/tracking-devices`,
    {
      device_type: deviceType,
      share_url: shareUrl,
      last_known_latitude: initialLat,
      last_known_longitude: initialLng
    },
    seeded.ownerToken
  );
  const deviceId = linkResp.tracking_device.id as string;

  // Simulate 1-2 more pings arriving over time (no HTTP endpoint exists for
  // this - a device is linked once and pings independently - so we update
  // its last-known position directly, same technique as scripts/move-demo-location.ts).
  const hitCount = 1 + Math.floor(Math.random() * 2);
  for (let h = 0; h < hitCount; h++) {
    const hopLat = initialLat + jitter(0.015);
    const hopLng = initialLng + jitter(0.015);
    await pool.query(
      `UPDATE tracking_devices SET last_known_latitude = $2, last_known_longitude = $3, last_updated_at = now() - interval '${hitCount - h} hours' WHERE id = $1`,
      [deviceId, hopLat, hopLng]
    );
  }

  console.log(`         tracking device (${deviceType}) linked with ${hitCount} location ping(s)`);
}

async function addFoundReport(seeded: SeededPet) {
  const pet = PETS.find((p) => p.name === seeded.petName)!;
  const reportLat = seeded.lat + jitter(0.03);
  const reportLng = seeded.lng + jitter(0.03);

  await postForm("/found-reports", {
    reporter_name: "A Concerned Neighbor",
    reporter_email: `finder_${seeded.petId.slice(0, 8)}@example.com`,
    description: `${pick(FINDER_NOTES)} Looked like a ${pet.color.toLowerCase()} ${pet.species} near ${seeded.neighborhood}.`,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    lat: String(reportLat),
    lng: String(reportLng)
  });

  console.log(`         found-report filed by a passerby near (${reportLat.toFixed(4)}, ${reportLng.toFixed(4)})`);
}

async function notifyPass(): Promise<void> {
  // Separate, DB-driven pass (rather than reusing in-memory owner tokens from
  // seedOnePet) so it works regardless of how many batches seeding took.
  console.log("\n=== Triggering community/BOLO/found-nearby notifications ===");
  console.log("(each owner \"checks the app\" near their own pet's last-known spot,");
  console.log(" which evaluates every other pet/report within their notification radius)\n");

  const { rows } = await pool.query<{ owner_id: string; center_lat: number; center_lng: number; pet_name: string }>(
    `SELECT ls.owner_id, ls.center_lat, ls.center_lng, p.name AS pet_name
     FROM lost_pet_searches ls
     JOIN pets p ON p.id = ls.pet_id
     WHERE ls.status = 'active'`
  );

  for (const row of rows) {
    await evaluateLocationUpdate(row.owner_id, row.center_lat, row.center_lng);
    console.log(`- evaluated location update for ${row.pet_name}'s owner`);
  }
}

async function main() {
  // The register/verify endpoints are IP-rate-limited (5 per 15 min, in-memory,
  // resets on server restart) as an anti-abuse control we shouldn't weaken -
  // so this script supports seeding in batches: `tsx seed-demo-missing-pets.ts
  // <startIndex> <endIndexExclusive>`, restarting the backend between batches,
  // and a final `tsx seed-demo-missing-pets.ts notify` pass once all batches
  // are seeded.
  if (process.argv[2] === "notify") {
    await notifyPass();
    await closeDatabase();
    return;
  }

  const startIndex = process.argv[2] ? Number(process.argv[2]) : 0;
  const endIndex = process.argv[3] ? Number(process.argv[3]) : PETS.length;

  console.log(`=== Seeding mock missing pets ${startIndex}-${endIndex - 1} across San Diego ===\n`);
  const seeded: SeededPet[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const pet = await seedOnePet(i);
    seeded.push(pet);

    // Not every pet gets a tracker or a sighting - keep it realistic.
    if (Math.random() < 0.65) await addTrackingDeviceWithHits(pet);
    if (Math.random() < 0.7) await addFoundReport(pet);
  }

  console.log("\n=== Batch done ===");
  console.table(
    seeded.map((s) => ({
      pet: s.petName,
      neighborhood: s.neighborhood,
      lat: s.lat.toFixed(4),
      lng: s.lng.toFixed(4),
      vet_bolos: s.vetBolosDispatched,
      search_id: s.searchId
    }))
  );

  await closeDatabase();
}

main().catch(async (err) => {
  console.error("Seed script failed:", err);
  await closeDatabase();
  process.exit(1);
});
