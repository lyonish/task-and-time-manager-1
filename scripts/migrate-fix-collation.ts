import { config } from "dotenv";
config({ path: ".env.local", override: false });

import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  await conn.execute("ALTER TABLE planned_assignments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await conn.execute("ALTER TABLE user_capacity CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  console.log("Collation fixed.");
  await conn.end();
}

main().catch(console.error);
