/**
 * migrate-add-reviews.ts
 *
 * Adds work_log_reviews and work_log_review_comments tables.
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/migrate-add-reviews.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS work_log_reviews (
        id VARCHAR(36) PRIMARY KEY,
        reviewer_id VARCHAR(36) NOT NULL,
        reviewee_id VARCHAR(36) NOT NULL,
        period_type ENUM('week','month') NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_review (reviewer_id, reviewee_id, period_start, period_end),
        INDEX idx_reviews_reviewee (reviewee_id),
        INDEX idx_reviews_reviewer (reviewer_id)
      )
    `).catch(() => console.log("work_log_reviews already exists — skipping"));

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS work_log_review_comments (
        id VARCHAR(36) PRIMARY KEY,
        review_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        action_type VARCHAR(50) NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_review_comments_review (review_id)
      )
    `).catch(() => console.log("work_log_review_comments already exists — skipping"));

    console.log("Migration complete.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
