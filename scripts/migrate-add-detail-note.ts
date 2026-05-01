/**
 * migrate-add-detail-note.ts
 *
 * Adds detail_note column to work_logs.
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/migrate-add-detail-note.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await conn.execute(`
      ALTER TABLE work_logs
        ADD COLUMN detail_note TEXT NULL AFTER note
    `).catch(() => console.log("detail_note already exists — skipping"));
    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
