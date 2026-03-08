import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const { tasks, taskLayers, projects, users, workflowStatuses } = schema;

async function seed() {
  console.log("Connecting to database...");

  const poolConnection = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const db = drizzle(poolConnection, { schema, mode: "default" });

  console.log("Seeding test tasks...");

  // Get first project
  const project = await db.query.projects.findFirst();
  if (!project) {
    console.error("No project found. Please create a project first.");
    process.exit(1);
  }
  console.log(`Using project: ${project.name} (${project.id})`);

  // Get first user
  const user = await db.query.users.findFirst();
  if (!user) {
    console.error("No user found.");
    process.exit(1);
  }
  console.log(`Using user: ${user.name} (${user.id})`);

  // Get or create birds layers
  let layers = await db.query.taskLayers.findMany({
    where: eq(taskLayers.projectId, project.id),
  });

  if (layers.length === 0) {
    console.log("Creating birds layer preset...");
    const birdsLayers = [
      { name: "Condor", color: "#8b5cf6", position: 0 },
      { name: "Eagle", color: "#3b82f6", position: 1 },
      { name: "Pigeon", color: "#22c55e", position: 2 },
      { name: "Sparrow", color: "#9ca3af", position: 3 },
    ];

    for (const layer of birdsLayers) {
      await db.insert(taskLayers).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        name: layer.name,
        color: layer.color,
        position: layer.position,
      });
    }

    layers = await db.query.taskLayers.findMany({
      where: eq(taskLayers.projectId, project.id),
    });
  }

  const condor = layers.find((l) => l.name === "Condor");
  const eagle = layers.find((l) => l.name === "Eagle");
  const pigeon = layers.find((l) => l.name === "Pigeon");
  const sparrow = layers.find((l) => l.name === "Sparrow");

  if (!condor || !eagle || !pigeon || !sparrow) {
    console.error("Birds layers not found. Please apply the birds preset first.");
    process.exit(1);
  }

  console.log("Found layers:", layers.map(l => l.name).join(", "));

  // Get default status
  const defaultStatus = await db.query.workflowStatuses.findFirst({
    where: eq(workflowStatuses.projectId, project.id),
  });

  const priorities = ["None", "Low", "Medium", "High", "Urgent"] as const;

  // Helper to create task
  const createTask = async (
    title: string,
    layerId: string,
    parentTaskId: string | null,
    priority: (typeof priorities)[number] = "None",
    position: number
  ) => {
    const id = crypto.randomUUID();
    await db.insert(tasks).values({
      id,
      projectId: project.id,
      statusId: defaultStatus?.id || null,
      layerId,
      parentTaskId,
      title,
      priority,
      position,
      createdBy: user.id,
    });
    return id;
  };

  // Delete existing tasks for clean slate
  console.log("Clearing existing tasks...");
  await db.delete(tasks).where(eq(tasks.projectId, project.id));

  console.log("Creating 60 test tasks with birds hierarchy...");

  // === CONDOR 1: Website Redesign ===
  const c1 = await createTask("Website Redesign Project", condor.id, null, "High", 0);

  // Eagles under Condor 1
  const e1 = await createTask("Design Phase", eagle.id, c1, "High", 1);
  const e2 = await createTask("Development Phase", eagle.id, c1, "Medium", 2);
  const e3 = await createTask("Testing & Launch", eagle.id, c1, "Medium", 3);

  // Pigeons under Eagle 1 (Design)
  const p1 = await createTask("Create wireframes", pigeon.id, e1, "High", 4);
  const p2 = await createTask("Design mockups", pigeon.id, e1, "Medium", 5);
  const p3 = await createTask("Design review meeting", pigeon.id, e1, "Low", 6);

  // Sparrows under Pigeon 1
  await createTask("Homepage wireframe", sparrow.id, p1, "Medium", 7);
  await createTask("Product page wireframe", sparrow.id, p1, "Low", 8);
  await createTask("Checkout wireframe", sparrow.id, p1, "Medium", 9);

  // Pigeons under Eagle 2 (Development)
  const p4 = await createTask("Frontend implementation", pigeon.id, e2, "High", 10);
  const p5 = await createTask("Backend API", pigeon.id, e2, "High", 11);
  const p6 = await createTask("Database setup", pigeon.id, e2, "Medium", 12);

  // Sparrows under Pigeon 4
  await createTask("Setup React project", sparrow.id, p4, "Low", 13);
  await createTask("Implement header component", sparrow.id, p4, "Medium", 14);
  await createTask("Implement footer component", sparrow.id, p4, "Low", 15);

  // Pigeons under Eagle 3 (Testing)
  await createTask("Unit testing", pigeon.id, e3, "Medium", 16);
  await createTask("Integration testing", pigeon.id, e3, "High", 17);
  await createTask("Deploy to production", pigeon.id, e3, "Urgent", 18);

  // === CONDOR 2: Mobile App ===
  const c2 = await createTask("Mobile App Development", condor.id, null, "High", 19);

  // Eagles under Condor 2
  const e4 = await createTask("iOS Development", eagle.id, c2, "High", 20);
  const e5 = await createTask("Android Development", eagle.id, c2, "High", 21);

  // Pigeons under Eagle 4 (iOS)
  const p7 = await createTask("Setup Xcode project", pigeon.id, e4, "Medium", 22);
  await createTask("Implement login screen", pigeon.id, e4, "High", 23);
  await createTask("Implement home screen", pigeon.id, e4, "Medium", 24);

  // Sparrows under Pigeon 7
  await createTask("Configure provisioning profiles", sparrow.id, p7, "Low", 25);
  await createTask("Setup CocoaPods", sparrow.id, p7, "Low", 26);

  // Pigeons under Eagle 5 (Android)
  await createTask("Setup Android Studio project", pigeon.id, e5, "Medium", 27);
  await createTask("Implement login screen", pigeon.id, e5, "High", 28);
  await createTask("Implement home screen", pigeon.id, e5, "Medium", 29);

  // === CONDOR 3: Marketing Campaign ===
  const c3 = await createTask("Q2 Marketing Campaign", condor.id, null, "High", 30);

  // Eagles under Condor 3
  const e6 = await createTask("Content Strategy", eagle.id, c3, "High", 31);
  const e7 = await createTask("Social Media", eagle.id, c3, "Medium", 32);
  const e8 = await createTask("Email Marketing", eagle.id, c3, "Medium", 33);

  // Pigeons under Eagle 6 (Content)
  const p8 = await createTask("Blog posts planning", pigeon.id, e6, "High", 34);
  await createTask("Video content creation", pigeon.id, e6, "Medium", 35);
  await createTask("Infographics design", pigeon.id, e6, "Low", 36);

  // Sparrows under Pigeon 8
  await createTask("Research keywords", sparrow.id, p8, "Medium", 37);
  await createTask("Write draft outlines", sparrow.id, p8, "Low", 38);
  await createTask("Review competitor blogs", sparrow.id, p8, "Low", 39);

  // Pigeons under Eagle 7 (Social)
  const p9 = await createTask("Instagram campaign", pigeon.id, e7, "High", 40);
  await createTask("Twitter engagement", pigeon.id, e7, "Medium", 41);
  await createTask("LinkedIn posts", pigeon.id, e7, "Low", 42);

  // Sparrows under Pigeon 9
  await createTask("Design post templates", sparrow.id, p9, "Medium", 43);
  await createTask("Schedule posts", sparrow.id, p9, "Low", 44);

  // Pigeons under Eagle 8 (Email)
  await createTask("Newsletter redesign", pigeon.id, e8, "High", 45);
  await createTask("Automation sequences", pigeon.id, e8, "Medium", 46);
  await createTask("A/B testing setup", pigeon.id, e8, "Low", 47);

  // === CONDOR 4: Infrastructure Upgrade ===
  const c4 = await createTask("Infrastructure Upgrade", condor.id, null, "Urgent", 48);

  // Eagles under Condor 4
  const e9 = await createTask("Cloud Migration", eagle.id, c4, "Urgent", 49);
  const e10 = await createTask("Security Hardening", eagle.id, c4, "High", 50);

  // Pigeons under Eagle 9 (Cloud)
  const p10 = await createTask("Assess current infrastructure", pigeon.id, e9, "High", 51);
  await createTask("Plan migration strategy", pigeon.id, e9, "High", 52);
  await createTask("Execute migration", pigeon.id, e9, "Urgent", 53);

  // Sparrows under Pigeon 10
  await createTask("Document existing services", sparrow.id, p10, "Medium", 54);
  await createTask("Identify dependencies", sparrow.id, p10, "High", 55);
  await createTask("Cost analysis", sparrow.id, p10, "Medium", 56);

  // Pigeons under Eagle 10 (Security)
  await createTask("Security audit", pigeon.id, e10, "Urgent", 57);
  await createTask("Implement 2FA", pigeon.id, e10, "High", 58);
  await createTask("Update firewall rules", pigeon.id, e10, "High", 59);

  console.log("\nDone! Created 60 tasks with hierarchical structure.");
  console.log("\nHierarchy:");
  console.log("- 4 Condors (top-level initiatives)");
  console.log("  - 10 Eagles (major features)");
  console.log("    - 24 Pigeons (tasks)");
  console.log("      - 17 Sparrows (subtasks)");

  await poolConnection.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
