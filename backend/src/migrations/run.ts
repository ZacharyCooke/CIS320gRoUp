import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { QueryResult } from "pg";
import { pool } from "../config/database.js";

type QueryFn = (text: string, params?: unknown[]) => Promise<QueryResult>;

export interface Migration {
  id: string;
  up: (query: QueryFn) => Promise<void>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function ensureMigrationTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function run(): Promise<void> {
  await ensureMigrationTable();

  const files = (await readdir(__dirname))
    .filter((file) => /^\d+.*\.(ts|js)$/.test(file))
    .sort();

  for (const file of files) {
    const moduleUrl = pathToFileURL(path.join(__dirname, file)).href;
    const migration = (await import(moduleUrl)).default as Migration;
    const existing = await pool.query("SELECT id FROM schema_migrations WHERE id = $1", [
      migration.id
    ]);

    if (existing.rowCount) {
      continue;
    }

    await migration.up(pool.query.bind(pool));
    await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
    console.log(`Applied migration ${migration.id}`);
  }

  await pool.end();
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
