/**
 * migrate-add-estimated-times.ts
 *
 * Adds estimated schedule columns to work_logs and estimated_hours to tasks.
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/migrate-add-estimated-times.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    // Make actual start_time nullable (entries may be estimate-only)
    await conn.execute(`
      ALTER TABLE work_logs
        MODIFY COLUMN start_time TIMESTAMP NULL
    `).catch(() => console.log("start_time already nullable — skipping"));

    // Add estimated_start_time
    await conn.execute(`
      ALTER TABLE work_logs
        ADD COLUMN estimated_start_time TIMESTAMP NULL AFTER task_id
    `).catch(() => console.log("estimated_start_time already exists — skipping"));

    // Add estimated_end_time
    await conn.execute(`
      ALTER TABLE work_logs
        ADD COLUMN estimated_end_time TIMESTAMP NULL AFTER estimated_start_time
    `).catch(() => console.log("estimated_end_time already exists — skipping"));

    // Add estimated_hours to tasks
    await conn.execute(`
      ALTER TABLE tasks
        ADD COLUMN estimated_hours DECIMAL(6,2) NULL AFTER due_date
    `).catch(() => console.log("estimated_hours already exists — skipping"));

    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
