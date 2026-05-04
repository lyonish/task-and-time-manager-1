import { config } from "dotenv";
config({ path: ".env.local", override: false });
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [ws] = await conn.query("SELECT id, name FROM workspaces LIMIT 5") as any[];
  console.log("workspaces:", JSON.stringify(ws, null, 2));
  const [us] = await conn.query("SELECT id, name, email FROM users LIMIT 20") as any[];
  console.log("users:", JSON.stringify(us, null, 2));
  const [gs] = await conn.query("SELECT id, name, workspace_id FROM user_groups LIMIT 10") as any[];
  console.log("groups:", JSON.stringify(gs, null, 2));
  const [ps] = await conn.query("SELECT id, name, color, workspace_id FROM projects LIMIT 20") as any[];
  console.log("projects:", JSON.stringify(ps, null, 2));
  const [wm] = await conn.query("SELECT user_id, workspace_id, role FROM workspace_members LIMIT 30") as any[];
  console.log("workspace_members:", JSON.stringify(wm, null, 2));
  await conn.end();
}
main().catch(console.error);
