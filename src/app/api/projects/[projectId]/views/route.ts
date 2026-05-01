import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectViews, projects, workspaceMembers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { ViewConfig } from "@/lib/db/schema";

const DEFAULT_CONFIG: ViewConfig = { groupBy: "none", viewMode: "list", isCompact: false, filters: { updatedWithinDays: 14, dueWithinNextDays: 14 } };

import { and } from "drizzle-orm";

async function getProjectAndCheckMembership(projectId: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!member) return null;
  return project;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;
    const project = await getProjectAndCheckMembership(projectId, session.user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let views = await db
      .select()
      .from(projectViews)
      .where(eq(projectViews.projectId, projectId))
      .orderBy(asc(projectViews.position));

    // Auto-create a default view if none exist
    if (views.length === 0) {
      const [created] = await db
        .insert(projectViews)
        .values({
          projectId,
          name: "All Tasks",
          isDefault: true,
          position: 0,
          config: DEFAULT_CONFIG,
          createdBy: session.user.id,
        })
        .$returningId();
      views = await db
        .select()
        .from(projectViews)
        .where(eq(projectViews.id, created.id))
        .limit(1);
    }

    return NextResponse.json(views);
  } catch (error) {
    console.error("GET views error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;
    const project = await getProjectAndCheckMembership(projectId, session.user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const name = String(body.name ?? "New View").slice(0, 100);
    const config: ViewConfig = {
      groupBy: body.config?.groupBy ?? "none",
      viewMode: body.config?.viewMode ?? "list",
      isCompact: body.config?.isCompact ?? false,
      filters: {
        updatedWithinDays: body.config?.filters?.updatedWithinDays ?? 14,
        dueWithinNextDays: body.config?.filters?.dueWithinNextDays ?? 14,
      },
    };

    const existing = await db
      .select({ position: projectViews.position })
      .from(projectViews)
      .where(eq(projectViews.projectId, projectId))
      .orderBy(asc(projectViews.position));
    const nextPosition = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

    const [created] = await db
      .insert(projectViews)
      .values({ projectId, name, isDefault: false, position: nextPosition, config, createdBy: session.user.id })
      .$returningId();

    const [view] = await db.select().from(projectViews).where(eq(projectViews.id, created.id)).limit(1);
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    console.error("POST view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
