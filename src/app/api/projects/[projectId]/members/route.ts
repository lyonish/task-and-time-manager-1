import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { WorkspaceService } from "@/services/workspace.service";
import { getProjectRole } from "@/lib/projectAccess";
import { db } from "@/lib/db";
import { projectMembers, users, userGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET — list all principals for a project with resolved names
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;

    const project = await ProjectService.getById(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const role = await getProjectRole(projectId, session.user.id);
    if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const entries = await db.query.projectMembers.findMany({
      where: eq(projectMembers.projectId, projectId),
    });

    const resolved = await Promise.all(
      entries.map(async (e) => {
        if (e.principalType === "user") {
          const user = await db.query.users.findFirst({
            where: eq(users.id, e.principalId),
            columns: { id: true, name: true, email: true, avatarUrl: true },
          });
          return { ...e, name: user?.name ?? e.principalId, email: user?.email, avatarUrl: user?.avatarUrl };
        } else {
          const group = await db.query.userGroups.findFirst({
            where: eq(userGroups.id, e.principalId),
            columns: { id: true, name: true, isDefault: true },
          });
          return { ...e, name: group?.name ?? e.principalId, isDefault: group?.isDefault };
        }
      })
    );

    return NextResponse.json(resolved);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — add a user or group
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;

    const project = await ProjectService.getById(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const callerRole = await getProjectRole(projectId, session.user.id);
    if (callerRole !== "Owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { principalType, principalId, role } = await req.json();
    if (!principalType || !principalId || !role)
      return NextResponse.json({ error: "principalType, principalId, role required" }, { status: 400 });
    if (!["user", "group"].includes(principalType))
      return NextResponse.json({ error: "Invalid principalType" }, { status: 400 });
    if (!["Owner", "Editor", "Viewer"].includes(role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    if (principalType === "user") {
      const isMember = await WorkspaceService.isMember(project.workspaceId, principalId);
      if (!isMember) return NextResponse.json({ error: "User is not a workspace member" }, { status: 400 });
    } else {
      const group = await db.query.userGroups.findFirst({
        where: and(eq(userGroups.id, principalId), eq(userGroups.workspaceId, project.workspaceId)),
      });
      if (!group) return NextResponse.json({ error: "Group not found in workspace" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(projectMembers)
      .values({ id, projectId, principalType, principalId, role })
      .onDuplicateKeyUpdate({ set: { role } });

    return NextResponse.json({ id, projectId, principalType, principalId, role }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
