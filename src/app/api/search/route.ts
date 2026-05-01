import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, projects, workspaceMembers } from "@/lib/db/schema";
import { eq, and, like, inArray } from "drizzle-orm";
import { getAccessibleProjectIds } from "@/lib/projectAccess";

export interface SearchResult {
  projects: { id: string; name: string; color: string | null }[];
  tasks: {
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    projectColor: string | null;
    statusName: string | null;
    statusColor: string | null;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "";

    if (!q || q.length < 1) return NextResponse.json({ projects: [], tasks: [] } satisfies SearchResult);

    // Resolve workspace from membership if not provided
    let wsId = workspaceId;
    if (!wsId) {
      const membership = await db.query.workspaceMembers.findFirst({
        where: eq(workspaceMembers.userId, session.user.id),
      });
      wsId = membership?.workspaceId ?? "";
    }
    if (!wsId) return NextResponse.json({ projects: [], tasks: [] } satisfies SearchResult);

    const accessibleIds = await getAccessibleProjectIds(wsId, session.user.id);
    if (accessibleIds.length === 0) return NextResponse.json({ projects: [], tasks: [] } satisfies SearchResult);

    const pattern = `%${q}%`;

    // Search projects
    const matchedProjects = await db
      .select({ id: projects.id, name: projects.name, color: projects.color })
      .from(projects)
      .where(and(inArray(projects.id, accessibleIds), like(projects.name, pattern)))
      .limit(5);

    // Search tasks (with project + status info)
    const matchedTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.projectId, accessibleIds), like(tasks.title, pattern)),
      columns: { id: true, title: true, projectId: true },
      with: {
        project: { columns: { name: true, color: true } },
        status: { columns: { name: true, color: true } },
      },
      limit: 10,
    });

    return NextResponse.json({
      projects: matchedProjects,
      tasks: matchedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project?.name ?? "",
        projectColor: t.project?.color ?? null,
        statusName: t.status?.name ?? null,
        statusColor: t.status?.color ?? null,
      })),
    } satisfies SearchResult);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
