import { config } from "dotenv";
config({ path: ".env.local", override: false });
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    charset: "utf8mb4_0900_ai_ci",
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id            VARCHAR(36)  NOT NULL PRIMARY KEY,
      user_id       VARCHAR(36)  NOT NULL,
      actor_id      VARCHAR(36)  NULL,
      type          ENUM('comment_added','task_assigned','mention') NOT NULL,
      title         VARCHAR(255) NOT NULL,
      body          VARCHAR(500) NULL,
      task_id       VARCHAR(36)  NULL,
      project_id    VARCHAR(36)  NULL,
      is_read       TINYINT(1)   NOT NULL DEFAULT 0,
      created_at    TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user (user_id, created_at),
      INDEX idx_notifications_unread (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  console.log("notifications table created.");
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
