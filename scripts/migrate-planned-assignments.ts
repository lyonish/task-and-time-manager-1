/**
 * migrate-planned-assignments.ts
 *
 * Drops and recreates user_capacity and planned_assignments tables
 * with utf8mb4_unicode_ci collation to match existing tables.
 *
 * Run with:
 *   npx tsx scripts/migrate-planned-assignments.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  await conn.execute(`DROP TABLE IF EXISTS planned_assignments`);
  await conn.execute(`DROP TABLE IF EXISTS user_capacity`);
  console.log("Dropped existing tables.");

  await conn.execute(`
    CREATE TABLE user_capacity (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      workspace_id VARCHAR(36) NOT NULL,
      hours_per_day DECIMAL(4,1) NOT NULL DEFAULT 8.0,
      days_per_week INT NOT NULL DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_capacity (user_id, workspace_id)
    ) ENGINE=InnoDB
  `);
  console.log("user_capacity created.");

  await conn.execute(`
    CREATE TABLE planned_assignments (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      workspace_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      project_id VARCHAR(36) NULL,
      title VARCHAR(255) NOT NULL,
      start_date VARCHAR(10) NOT NULL,
      end_date VARCHAR(10) NOT NULL,
      estimated_hours DECIMAL(6,2) NOT NULL,
      note TEXT NULL,
      created_by VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pa_workspace_date (workspace_id, start_date, end_date),
      INDEX idx_pa_user (user_id)
    ) ENGINE=InnoDB
  `);
  console.log("planned_assignments created.");

  await conn.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
