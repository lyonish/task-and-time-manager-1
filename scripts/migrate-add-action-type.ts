/**
 * migrate-add-action-type.ts
 *
 * Adds action_type column to work_logs.
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/migrate-add-action-type.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await conn.execute(`
      ALTER TABLE work_logs
        ADD COLUMN action_type VARCHAR(50) NULL AFTER detail_note
    `).catch(() => console.log("action_type already exists — skipping"));
    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
