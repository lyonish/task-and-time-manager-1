import { db } from "@/lib/db";
import { projects, workspaces, projectMembers, userGroupMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { ProjectRole } from "@/lib/db/schema";

export type { ProjectRole };

export async function getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { workspaceId: true },
  });
  if (!project) return null;

  // Workspace owner always has Owner access
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, project.workspaceId),
    columns: { ownerId: true },
  });
  if (workspace?.ownerId === userId) return "Owner";

  // Direct user membership
  const direct = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.principalType, "user"),
      eq(projectMembers.principalId, userId),
    ),
  });
  if (direct) return direct.role as ProjectRole;

  // Group memberships
  const groupRows = await db
    .select({ groupId: userGroupMembers.groupId })
    .from(userGroupMembers)
    .where(eq(userGroupMembers.userId, userId));

  if (groupRows.length > 0) {
    const groupIds = groupRows.map((r) => r.groupId);
    const groupEntry = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.principalType, "group"),
        inArray(projectMembers.principalId, groupIds),
      ),
    });
    if (groupEntry) return groupEntry.role as ProjectRole;
  }

  return null;
}

export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  return (await getProjectRole(projectId, userId)) !== null;
}

export async function getAccessibleProjectIds(workspaceId: string, userId: string): Promise<string[]> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { ownerId: true },
    with: { projects: { columns: { id: true } } },
  });
  if (!workspace) return [];

  const allIds = workspace.projects.map((p) => p.id);
  if (allIds.length === 0) return [];

  // Workspace owner sees all
  if (workspace.ownerId === userId) return allIds;

  // Direct entries
  const directRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(and(
      eq(projectMembers.principalType, "user"),
      eq(projectMembers.principalId, userId),
      inArray(projectMembers.projectId, allIds),
    ));

  // Group entries
  const groupRows = await db
    .select({ groupId: userGroupMembers.groupId })
    .from(userGroupMembers)
    .where(eq(userGroupMembers.userId, userId));

  let groupProjectIds: string[] = [];
  if (groupRows.length > 0) {
    const groupIds = groupRows.map((r) => r.groupId);
    const groupEntries = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.principalType, "group"),
        inArray(projectMembers.principalId, groupIds),
        inArray(projectMembers.projectId, allIds),
      ));
    groupProjectIds = groupEntries.map((e) => e.projectId);
  }

  return [...new Set([...directRows.map((r) => r.projectId), ...groupProjectIds])];
}
