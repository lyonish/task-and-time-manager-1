/**
 * seed-work-logs-and-steps.ts
 *
 * Run AFTER seed-sample-data.ts.
 * - Clears all work logs and regenerates them for the past 14 days
 * - Adds steps to ~8 tasks across the two seeded projects
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const { users, workLogs, steps, projects, tasks, workflowStatuses } = schema;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}

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
  "Resolved merge conflict in main",
  "Finished feature branch, opened PR",
  "Backlog grooming session",
  null, null, null, null,  // ~20% blank
];

// Steps to add — keyed by exact task title
const STEPS_BY_TASK: Record<string, Array<{ title: string; status: string; done: boolean }>> = {
  // E-Commerce: Elasticsearch integration
  "Elasticsearch integration": [
    { title: "Set up Elasticsearch cluster",        status: "Done",        done: true  },
    { title: "Define document index schema",         status: "Done",        done: true  },
    { title: "Implement search service layer",       status: "In Progress", done: false },
    { title: "Write integration tests",              status: "To Do",       done: false },
  ],
  // E-Commerce: Cart Management
  "Cart Management": [
    { title: "Design cart data model",               status: "Done",        done: true  },
    { title: "Build cart API endpoints",             status: "In Progress", done: false },
    { title: "Frontend cart state management",       status: "To Do",       done: false },
  ],
  // E-Commerce: Payment integration
  "Payment integration": [
    { title: "Evaluate payment provider options",    status: "Done",        done: true  },
    { title: "Implement Stripe checkout session",    status: "In Progress", done: false },
    { title: "Handle webhook events",                status: "To Do",       done: false },
    { title: "Test with sandbox credentials",        status: "To Do",       done: false },
  ],
  // E-Commerce: Checkout Flow
  "Checkout Flow": [
    { title: "Wireframe & UX review",                status: "Done",        done: true  },
    { title: "Multi-step form component",            status: "In Progress", done: false },
    { title: "Order summary side panel",             status: "To Do",       done: false },
  ],
  // E-Commerce: Product Management
  "Product Management": [
    { title: "Define admin roles & permissions",     status: "Done",        done: true  },
    { title: "Build product table with filters",     status: "In Progress", done: false },
    { title: "Implement inline edit / delete",       status: "To Do",       done: false },
  ],
  // Analytics: ETL Framework
  "ETL Framework": [
    { title: "Document pipeline architecture",       status: "Done",        done: true  },
    { title: "Implement source adapter interface",   status: "Done",        done: true  },
    { title: "Add data quality validation",          status: "In Progress", done: false },
    { title: "Performance benchmarking",             status: "To Do",       done: false },
  ],
  // Analytics: Chart Library
  "Chart Library": [
    { title: "Evaluate D3 vs Recharts",              status: "Done",        done: true  },
    { title: "Set up chart abstraction layer",       status: "Done",        done: true  },
    { title: "Responsive sizing & theming",          status: "In Progress", done: false },
    { title: "Storybook documentation",              status: "To Do",       done: false },
  ],
  // Analytics: Dashboard Builder
  "Dashboard Builder": [
    { title: "Research grid layout libraries",       status: "Done",        done: true  },
    { title: "Prototype drag-and-drop canvas",       status: "In Progress", done: false },
    { title: "Persist layout to database",           status: "To Do",       done: false },
    { title: "Mobile-responsive fallback",           status: "To Do",       done: false },
  ],
};

async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
  });
  const db = drizzle(pool, { schema, mode: "default" });

  // ── 1. Collect all user IDs ──────────────────────────────────────────────
  const allUsers = await db.query.users.findMany({ columns: { id: true } });
  const allUserIds = allUsers.map((u) => u.id);
  console.log(`\nFound ${allUserIds.length} users.`);

  // ── 2. Clear existing work logs ──────────────────────────────────────────
  console.log("Clearing existing work logs...");
  await db.delete(workLogs).where(inArray(workLogs.userId, allUserIds));
  console.log("  done.");

  // ── 3. Collect all task IDs for log linking ──────────────────────────────
  const allTasks = await db.query.tasks.findMany({ columns: { id: true } });
  const allTaskIdPool = allTasks.map((t) => t.id);

  // ── 4. Generate 14 days of work logs ────────────────────────────────────
  console.log("\nCreating 14-day work logs...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 13 + i); // 13 days ago → today
    return d;
  });

  let logCount = 0;
  for (const userId of allUserIds) {
    for (const day of days) {
      const weekend = isWeekend(day);

      // Weekdays: 2–4 blocks. Weekends: 0–1 block (occasional).
      const maxLogs = weekend ? randInt(0, 1) : randInt(2, 4);
      if (maxLogs === 0) continue;

      let hour   = randInt(weekend ? 10 : 9, weekend ? 11 : 10);
      let minute = pick([0, 15, 30]);

      for (let i = 0; i < maxLogs; i++) {
        const startTime = new Date(day);
        startTime.setHours(hour, minute, 0, 0);

        // Duration: 60–180 min in 15-min steps
        const durationMins = pick([60, 75, 90, 105, 120, 135, 150, 165, 180]);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMins);

        if (endTime.getHours() >= 19) break; // no logs past 7 PM

        await db.insert(workLogs).values({
          id: crypto.randomUUID(),
          userId,
          taskId: pick(allTaskIdPool),
          startTime,
          endTime,
          note: pick(WORK_LOG_NOTES),
        });
        logCount++;

        // 15–30 min break
        const nextStart = new Date(endTime);
        nextStart.setMinutes(nextStart.getMinutes() + pick([15, 15, 30]));
        hour   = nextStart.getHours();
        minute = nextStart.getMinutes();
      }
    }
  }
  console.log(`  created ${logCount} work log entries across 14 days.`);

  // ── 5. Add steps to tasks ────────────────────────────────────────────────
  console.log("\nAdding steps to tasks...");

  // Find the two seeded projects
  const targetProjects = await db.query.projects.findMany({
    where: (p, { inArray: inArr }) =>
      inArr(p.name, ["E-Commerce Platform", "Data Analytics Dashboard"]),
    columns: { id: true, name: true },
  });

  if (targetProjects.length === 0) {
    console.log("  No seeded projects found — skipping steps.");
  } else {
    for (const project of targetProjects) {
      // Fetch this project's workflow statuses
      const statuses = await db.query.workflowStatuses.findMany({
        where: eq(workflowStatuses.projectId, project.id),
        columns: { id: true, name: true },
      });
      const statusMap: Record<string, string> = Object.fromEntries(
        statuses.map((s) => [s.name, s.id])
      );

      // Fetch all tasks in this project
      const projectTasks = await db.query.tasks.findMany({
        where: eq(tasks.projectId, project.id),
        columns: { id: true, title: true },
      });

      // Get workspace members for step assignees
      const memberPool = allUserIds;

      let stepCount = 0;
      for (const task of projectTasks) {
        const stepDefs = STEPS_BY_TASK[task.title];
        if (!stepDefs) continue;

        // Clear any previous steps on this task (idempotent re-run)
        await db.delete(steps).where(eq(steps.taskId, task.id));

        for (let pos = 0; pos < stepDefs.length; pos++) {
          const def = stepDefs[pos];
          const statusId = statusMap[def.status];
          if (!statusId) continue;

          await db.insert(steps).values({
            id: crypto.randomUUID(),
            taskId: task.id,
            statusId,
            title: def.title,
            position: pos,
            isCompleted: def.done,
            assigneeId: pick(memberPool),
          });
          stepCount++;
        }
        console.log(`  [${project.name}] "${task.title}" → ${stepDefs.length} steps`);
      }
    }
  }

  console.log("\nUpdate complete!");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
