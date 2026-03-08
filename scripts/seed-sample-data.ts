import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const {
  users,
  workspaces,
  workspaceMembers,
  projects,
  taskLayers,
  workflowStatuses,
  tasks,
  workLogs,
} = schema;

// ── helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ── data ───────────────────────────────────────────────────────────────────
const NEW_MEMBERS = [
  { name: "Alice Chen",      email: "alice.chen@example.com" },
  { name: "Bob Martinez",    email: "bob.martinez@example.com" },
  { name: "Carol Kim",       email: "carol.kim@example.com" },
  { name: "David Patel",     email: "david.patel@example.com" },
  { name: "Emma Johnson",    email: "emma.johnson@example.com" },
  { name: "Frank Nguyen",    email: "frank.nguyen@example.com" },
  { name: "Grace Liu",       email: "grace.liu@example.com" },
  { name: "Henry Brown",     email: "henry.brown@example.com" },
  { name: "Isabella Davis",  email: "isabella.davis@example.com" },
  { name: "James Wilson",    email: "james.wilson@example.com" },
  { name: "Kate Thompson",   email: "kate.thompson@example.com" },
  { name: "Liam Anderson",   email: "liam.anderson@example.com" },
  { name: "Maya Rodriguez",  email: "maya.rodriguez@example.com" },
  { name: "Noah Taylor",     email: "noah.taylor@example.com" },
];

const DEFAULT_STATUSES = [
  { name: "To Do",      color: "#9ca3af", isDefault: true,  isCompleted: false },
  { name: "In Progress",color: "#3b82f6", isDefault: false, isCompleted: false },
  { name: "In Review",  color: "#f59e0b", isDefault: false, isCompleted: false },
  { name: "Done",       color: "#22c55e", isDefault: false, isCompleted: true  },
];

const BIRDS = [
  { name: "Condor",  color: "#8b5cf6", position: 0 },
  { name: "Eagle",   color: "#3b82f6", position: 1 },
  { name: "Pigeon",  color: "#22c55e", position: 2 },
  { name: "Sparrow", color: "#9ca3af", position: 3 },
];

const WORK_LOG_NOTES = [
  "Implemented initial draft, needs review",
  "Fixed edge case in validation logic",
  "Code review with the team",
  "Daily standup + sprint planning",
  "Pair programming session",
  "Debugging integration test failures",
  "Writing unit tests",
  "Reviewing pull requests",
  "Refactoring for better readability",
  "Setting up CI pipeline",
  "Documentation updates",
  "Performance profiling session",
  "Stakeholder demo prep",
  "Syncing with design on UI changes",
  "Investigating production issue",
  null, null, null,  // some entries without notes
];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
  });
  const db = drizzle(pool, { schema, mode: "default" });

  // 1. Workspace
  const workspace = await db.query.workspaces.findFirst();
  if (!workspace) {
    console.error("No workspace found. Run the app and create one first.");
    process.exit(1);
  }
  console.log(`\nWorkspace: "${workspace.name}"`);

  // 2. Create 14 new members (skip if email already exists)
  console.log("\nCreating members...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const newMemberIds: string[] = [];

  for (const m of NEW_MEMBERS) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, m.email),
      columns: { id: true },
    });
    if (existing) {
      console.log(`  skip (exists): ${m.name}`);
      newMemberIds.push(existing.id);
    } else {
      const id = crypto.randomUUID();
      await db.insert(users).values({ id, email: m.email, name: m.name, passwordHash });
      console.log(`  created: ${m.name}`);
      newMemberIds.push(id);
    }
  }

  // 3. Add all 14 new members to workspace (skip duplicates)
  console.log("\nAdding to workspace...");
  for (const userId of newMemberIds) {
    const exists = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, userId),
      ),
    });
    if (!exists) {
      await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        userId,
        role: "Team_Member",
      });
    }
  }
  console.log("  done.");

  // Collect all user IDs (existing + new) for work log assignment
  const allUsers = await db.query.users.findMany({ columns: { id: true, name: true } });
  const allUserIds = allUsers.map((u) => u.id);
  const adminUserId = allUsers[0].id; // first user = creator of projects/tasks
  console.log(`\nTotal users for work logs: ${allUserIds.length}`);

  // 4. Helper: create a project with layers + statuses
  let globalTaskPos = 1000; // start high to avoid collision with existing tasks

  const setupProject = async (name: string, color: string) => {
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      workspaceId: workspace.id,
      name,
      color,
      createdBy: adminUserId,
    });

    // Statuses
    const statusMap: Record<string, string> = {};
    for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
      const s = DEFAULT_STATUSES[i];
      const id = crypto.randomUUID();
      await db.insert(workflowStatuses).values({
        id,
        projectId,
        name: s.name,
        color: s.color,
        position: i,
        isDefault: s.isDefault,
        isCompleted: s.isCompleted,
      });
      statusMap[s.name] = id;
    }

    // Layers
    const layerMap: Record<string, string> = {};
    for (const bird of BIRDS) {
      const id = crypto.randomUUID();
      await db.insert(taskLayers).values({
        id,
        projectId,
        name: bird.name,
        color: bird.color,
        position: bird.position,
      });
      layerMap[bird.name] = id;
    }

    return { projectId, statusMap, layerMap };
  };

  const taskIds: string[] = [];

  const addTask = async (
    title: string,
    projectId: string,
    layerId: string,
    parentId: string | null,
    statusId: string,
    priority: "None" | "Low" | "Medium" | "High" | "Urgent",
    assigneeId?: string,
  ) => {
    const id = crypto.randomUUID();
    await db.insert(tasks).values({
      id,
      projectId,
      statusId,
      layerId,
      parentTaskId: parentId,
      title,
      priority,
      position: globalTaskPos++,
      createdBy: adminUserId,
      assigneeId: assigneeId ?? null,
    });
    taskIds.push(id);
    return id;
  };

  // ── Project 1: E-Commerce Platform ──────────────────────────────────────
  console.log("\nCreating project: E-Commerce Platform...");
  const { projectId: p1, statusMap: s1, layerMap: l1 } = await setupProject("E-Commerce Platform", "#6366f1");
  const r = () => pick(newMemberIds); // random new member as assignee

  // Condor: Product Catalog
  const c1 = await addTask("Product Catalog",          p1, l1.Condor, null, s1["To Do"],       "High");
  const e1 = await addTask("Search & Filtering",        p1, l1.Eagle,  c1,  s1["In Progress"],  "High",   r());
  const pi1 = await addTask("Elasticsearch integration",p1, l1.Pigeon, e1,  s1["In Progress"],  "High",   r());
  await addTask("Configure index mappings",             p1, l1.Sparrow,pi1, s1["Done"],         "Medium", r());
  await addTask("Implement search UI components",       p1, l1.Sparrow,pi1, s1["In Progress"],  "Medium", r());
  await addTask("Filter sidebar UI",                    p1, l1.Pigeon, e1,  s1["To Do"],        "Medium", r());
  await addTask("Category navigation menu",             p1, l1.Pigeon, e1,  s1["To Do"],        "Low",    r());
  const e2 = await addTask("Product Detail Page",       p1, l1.Eagle,  c1,  s1["In Progress"],  "High",   r());
  await addTask("Image gallery with zoom",              p1, l1.Pigeon, e2,  s1["In Review"],    "Medium", r());
  await addTask("Customer reviews & ratings",           p1, l1.Pigeon, e2,  s1["To Do"],        "Low",    r());

  // Condor: Shopping Cart
  const c2 = await addTask("Shopping Cart",             p1, l1.Condor, null, s1["In Progress"], "Urgent");
  const e3 = await addTask("Cart Management",           p1, l1.Eagle,  c2,  s1["In Progress"],  "High",   r());
  await addTask("Add / remove items",                   p1, l1.Pigeon, e3,  s1["Done"],         "High",   r());
  await addTask("Quantity update controls",             p1, l1.Pigeon, e3,  s1["Done"],         "Medium", r());
  await addTask("Persistent cart (logged-in users)",    p1, l1.Pigeon, e3,  s1["In Progress"],  "Medium", r());
  const e4 = await addTask("Checkout Flow",             p1, l1.Eagle,  c2,  s1["To Do"],        "Urgent", r());
  const pi4 = await addTask("Shipping address form",    p1, l1.Pigeon, e4,  s1["To Do"],        "High",   r());
  await addTask("Address validation API",               p1, l1.Sparrow,pi4, s1["To Do"],        "Medium", r());
  const pi5 = await addTask("Payment integration",      p1, l1.Pigeon, e4,  s1["To Do"],        "Urgent", r());
  await addTask("Stripe webhook handler",               p1, l1.Sparrow,pi5, s1["To Do"],        "High",   r());
  await addTask("Order confirmation email",             p1, l1.Pigeon, e4,  s1["To Do"],        "Medium", r());

  // Condor: Admin Dashboard
  const c3 = await addTask("Admin Dashboard",           p1, l1.Condor, null, s1["To Do"],       "Medium");
  const e5 = await addTask("Product Management",        p1, l1.Eagle,  c3,  s1["To Do"],        "High",   r());
  await addTask("Product CRUD interface",               p1, l1.Pigeon, e5,  s1["To Do"],        "High",   r());
  await addTask("Bulk CSV import / export",             p1, l1.Pigeon, e5,  s1["To Do"],        "Medium", r());
  // 25 tasks ✓

  // ── Project 2: Data Analytics Dashboard ─────────────────────────────────
  console.log("Creating project: Data Analytics Dashboard...");
  const { projectId: p2, statusMap: s2, layerMap: l2 } = await setupProject("Data Analytics Dashboard", "#f59e0b");

  // Condor: Data Ingestion
  const d1 = await addTask("Data Ingestion Pipeline",   p2, l2.Condor, null, s2["In Progress"], "High");
  const de1 = await addTask("ETL Framework",            p2, l2.Eagle,  d1,  s2["In Progress"],  "High",   r());
  const dp1 = await addTask("Source connectors",        p2, l2.Pigeon, de1, s2["Done"],         "High",   r());
  await addTask("REST API connector",                   p2, l2.Sparrow,dp1, s2["Done"],         "Medium", r());
  await addTask("Database connector",                   p2, l2.Sparrow,dp1, s2["In Review"],    "Medium", r());
  await addTask("Data transformation rules",            p2, l2.Pigeon, de1, s2["In Progress"],  "High",   r());
  await addTask("Error handling & retry logic",         p2, l2.Pigeon, de1, s2["To Do"],        "Medium", r());
  const de2 = await addTask("Real-time Streaming",      p2, l2.Eagle,  d1,  s2["To Do"],        "High",   r());
  await addTask("Kafka topic setup",                    p2, l2.Pigeon, de2, s2["To Do"],        "High",   r());
  await addTask("Stream processing jobs",               p2, l2.Pigeon, de2, s2["To Do"],        "High",   r());

  // Condor: Visualization
  const d2 = await addTask("Visualization Layer",       p2, l2.Condor, null, s2["In Progress"], "High");
  const de3 = await addTask("Chart Library",            p2, l2.Eagle,  d2,  s2["In Progress"],  "High",   r());
  await addTask("Time-series line charts",              p2, l2.Pigeon, de3, s2["In Progress"],  "High",   r());
  await addTask("Bar and pie charts",                   p2, l2.Pigeon, de3, s2["Done"],         "Medium", r());
  const dp3 = await addTask("Drill-down functionality", p2, l2.Pigeon, de3, s2["In Review"],    "Medium", r());
  await addTask("Cross-filter on chart click",          p2, l2.Sparrow,dp3, s2["In Review"],    "Medium", r());
  const de4 = await addTask("Dashboard Builder",        p2, l2.Eagle,  d2,  s2["To Do"],        "Medium", r());
  await addTask("Drag-and-drop widget layout",          p2, l2.Pigeon, de4, s2["To Do"],        "High",   r());
  await addTask("Widget configuration panel",           p2, l2.Pigeon, de4, s2["To Do"],        "Medium", r());
  const dp4 = await addTask("Export to PDF / PNG",      p2, l2.Pigeon, de4, s2["To Do"],        "Low",    r());
  await addTask("Scheduled email reports",              p2, l2.Sparrow,dp4, s2["To Do"],        "Low",    r());

  // Condor: Access Control
  const d3 = await addTask("Access Control",            p2, l2.Condor, null, s2["To Do"],       "High");
  const de5 = await addTask("Role-Based Access",        p2, l2.Eagle,  d3,  s2["To Do"],        "High",   r());
  await addTask("Dashboard sharing & permissions",      p2, l2.Pigeon, de5, s2["To Do"],        "High",   r());
  await addTask("Row-level data security",              p2, l2.Pigeon, de5, s2["To Do"],        "High",   r());
  // 25 tasks ✓

  console.log(`  created ${taskIds.length} new tasks across 2 projects.`);

  // ── 5. Work logs: 3 days × all users ────────────────────────────────────
  console.log("\nCreating work logs...");

  // All tasks (existing + new) available for log linking
  const allTasks = await db.query.tasks.findMany({ columns: { id: true } });
  const allTaskIdPool = allTasks.map((t) => t.id);

  const today = new Date();
  const days = [-2, -1, 0].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  let logCount = 0;
  for (const userId of allUserIds) {
    for (const day of days) {
      // 2–4 log blocks per day
      const numLogs = randInt(2, 4);
      let hour = randInt(9, 10);
      let minute = pick([0, 15, 30]);

      for (let i = 0; i < numLogs; i++) {
        const startTime = new Date(day);
        startTime.setHours(hour, minute, 0, 0);

        // Duration: 60–180 min, in 15-min steps
        const durationMins = pick([60, 75, 90, 105, 120, 135, 150, 165, 180]);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMins);

        if (endTime.getHours() >= 19) break; // don't log past 7 PM

        await db.insert(workLogs).values({
          id: crypto.randomUUID(),
          userId,
          taskId: pick(allTaskIdPool),
          startTime,
          endTime,
          note: pick(WORK_LOG_NOTES),
        });
        logCount++;

        // 15–30 min break between blocks
        const breakMins = pick([15, 15, 30]);
        const totalMins = hour * 60 + endTime.getMinutes() + durationMins + breakMins;
        // Recalculate from endTime + break
        const nextStart = new Date(endTime);
        nextStart.setMinutes(nextStart.getMinutes() + breakMins);
        hour = nextStart.getHours();
        minute = nextStart.getMinutes();
      }
    }
  }

  console.log(`  created ${logCount} work log entries.`);
  console.log("\nSeed complete!");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
