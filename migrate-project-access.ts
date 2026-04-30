/**
 * Migration: project-level access control
 *
 * For each existing workspace:
 *   - Creates an "Everyone" default group
 *   - Adds all current workspace members to that group
 *
 * For each existing project:
 *   - Adds the project creator as Owner in project_members
 *   - Does NOT grant access to other members (projects start private)
 *
 * Run once: npx tsx migrate-project-access.ts
 */

import { db } from "./src/lib/db";
import { workspaces, workspaceMembers, projects, userGroups, userGroupMembers, projectMembers } from "./src/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  const allWorkspaces = await db.select().from(workspaces);
  console.log(`Processing ${allWorkspaces.length} workspace(s)…`);

  for (const ws of allWorkspaces) {
    // Create Everyone group if it doesn't already exist
    const existing = await db.query.userGroups.findFirst({
      where: and(eq(userGroups.workspaceId, ws.id), eq(userGroups.isDefault, true)),
    });

    let groupId: string;
    if (existing) {
      groupId = existing.id;
      console.log(`  [${ws.name}] Everyone group already exists`);
    } else {
      groupId = crypto.randomUUID();
      await db.insert(userGroups).values({ id: groupId, workspaceId: ws.id, name: "Everyone", isDefault: true });
      console.log(`  [${ws.name}] Created Everyone group`);
    }

    // Add all workspace members to Everyone group
    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id));
    for (const m of members) {
      await db.insert(userGroupMembers)
        .values({ groupId, userId: m.userId })
        .onDuplicateKeyUpdate({ set: { groupId } });
    }
    console.log(`  [${ws.name}] Added ${members.length} member(s) to Everyone group`);
  }

  // Add project creators as Owner
  const allProjects = await db.select().from(projects);
  console.log(`\nProcessing ${allProjects.length} project(s)…`);

  for (const p of allProjects) {
    await db.insert(projectMembers)
      .values({ projectId: p.id, principalType: "user", principalId: p.createdBy, role: "Owner" })
      .onDuplicateKeyUpdate({ set: { role: "Owner" } });
    console.log(`  [${p.name}] Set creator as Owner`);
  }

  console.log("\nDone.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
