import { pool, closeDatabase } from "../config/database.js";

const searchId = process.argv[2];
const petId = process.argv[3];
const lat = Number(process.argv[4]);
const lng = Number(process.argv[5]);

if (!searchId || !petId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
  throw new Error("Usage: tsx src/scripts/move-demo-location.ts <search-id> <pet-id> <lat> <lng>");
}

try {
  await pool.query("BEGIN");
  await pool.query(
    `UPDATE lost_pet_searches
     SET center_lat = $2, center_lng = $3, updated_at = now()
     WHERE id = $1`,
    [searchId, lat, lng]
  );
  await pool.query(
    `UPDATE tracking_devices
     SET last_known_latitude = $2, last_known_longitude = $3, last_updated_at = now()
     WHERE pet_id = $1`,
    [petId, lat, lng]
  );
  await pool.query("COMMIT");

  console.log(JSON.stringify({ search_id: searchId, pet_id: petId, lat, lng }, null, 2));
} catch (err) {
  await pool.query("ROLLBACK");
  throw err;
} finally {
  await closeDatabase();
}
