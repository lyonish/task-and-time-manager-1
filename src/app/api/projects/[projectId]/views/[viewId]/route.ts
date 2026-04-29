import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectViews, projects, workspaceMembers } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

async function checkAccess(projectId: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);
  if (!member || member.workspaceId !== project.workspaceId) return null;
  return project;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; viewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, viewId } = await params;
    const project = await checkAccess(projectId, session.user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [view] = await db
      .select()
      .from(projectViews)
      .where(and(eq(projectViews.id, viewId), eq(projectViews.projectId, projectId)))
      .limit(1);
    if (!view) return NextResponse.json({ error: "View not found" }, { status: 404 });

    const body = await req.json();
    const updates: Partial<typeof projectViews.$inferInsert> = {};

    if (typeof body.name === "string") updates.name = body.name.slice(0, 100);
    if (body.config !== undefined) updates.config = body.config;
    if (body.isDefault === true) {
      // Clear default on all other views first
      await db
        .update(projectViews)
        .set({ isDefault: false })
        .where(and(eq(projectViews.projectId, projectId), ne(projectViews.id, viewId)));
      updates.isDefault = true;
    }

    await db.update(projectViews).set(updates).where(eq(projectViews.id, viewId));
    const [updated] = await db.select().from(projectViews).where(eq(projectViews.id, viewId)).limit(1);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; viewId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, viewId } = await params;
    const project = await checkAccess(projectId, session.user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allViews = await db
      .select({ id: projectViews.id })
      .from(projectViews)
      .where(eq(projectViews.projectId, projectId));
    if (allViews.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last view" }, { status: 400 });
    }

    await db
      .delete(projectViews)
      .where(and(eq(projectViews.id, viewId), eq(projectViews.projectId, projectId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
