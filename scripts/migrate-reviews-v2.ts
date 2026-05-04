/**
 * migrate-reviews-v2.ts
 *
 * Drops old work_log_reviews + work_log_review_comments tables and recreates
 * work_log_review_comments with the new schema. Also adds role column to
 * user_group_members (idempotent).
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/migrate-reviews-v2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    // Drop old tables (they're empty in dev; recreate clean)
    await conn.execute(`DROP TABLE IF EXISTS work_log_review_comments`);
    console.log("Dropped work_log_review_comments (if existed)");

    await conn.execute(`DROP TABLE IF EXISTS work_log_reviews`);
    console.log("Dropped work_log_reviews (if existed)");

    // New comments table
    await conn.execute(`
      CREATE TABLE work_log_review_comments (
        id VARCHAR(36) PRIMARY KEY,
        author_id VARCHAR(36) NOT NULL,
        reviewee_id VARCHAR(36) NOT NULL,
        period_type ENUM('week','month') NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        task_id VARCHAR(36) NULL,
        action_type VARCHAR(50) NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rc_reviewee_period (reviewee_id, period_start, period_end),
        INDEX idx_rc_author (author_id)
      )
    `);
    console.log("Created work_log_review_comments");

    // Add role column to user_group_members (idempotent)
    await conn.execute(
      `ALTER TABLE user_group_members ADD COLUMN role ENUM('Leader','Member') NOT NULL DEFAULT 'Member' AFTER user_id`
    ).catch(() => console.log("role column already exists on user_group_members — skipping"));
    console.log("user_group_members.role ensured");

    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
