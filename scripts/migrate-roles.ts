/**
 * migrate-roles.ts
 *
 * One-time migration: renames roles from the old 3-tier system to the new 4-tier system.
 *   Admin           → Admin  (unchanged)
 *   Project_Manager → Admin
 *   Team_Member     → Member
 *
 * Run BEFORE deploying the schema change:
 *   DATABASE_URL="..." npx tsx scripts/migrate-roles.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Step 1: Widen the enum to accept both old and new values
  await conn.execute(
    `ALTER TABLE workspace_members
     MODIFY COLUMN role ENUM('Admin','Project_Manager','Team_Member','Member','Guest')
     NOT NULL DEFAULT 'Member'`
  );
  console.log("Enum widened.");

  // Step 2: Migrate data
  const [r1] = await conn.execute(
    `UPDATE workspace_members SET role = 'Admin' WHERE role = 'Project_Manager'`
  );
  console.log(`Project_Manager → Admin: ${(r1 as mysql.ResultSetHeader).affectedRows} rows`);

  const [r2] = await conn.execute(
    `UPDATE workspace_members SET role = 'Member' WHERE role = 'Team_Member'`
  );
  console.log(`Team_Member → Member: ${(r2 as mysql.ResultSetHeader).affectedRows} rows`);

  // Step 3: Add iconUrl column if not exists
  await conn.execute(
    `ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500)`
  );
  console.log("icon_url column ensured.");

  // Step 4: Narrow the enum to final values
  await conn.execute(
    `ALTER TABLE workspace_members
     MODIFY COLUMN role ENUM('Admin','Member','Guest')
     NOT NULL DEFAULT 'Member'`
  );
  console.log("Enum narrowed to Admin | Member | Guest.");

  await conn.end();
  console.log("Migration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
