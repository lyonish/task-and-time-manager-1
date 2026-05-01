import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Returns tasks assigned to the current user, optionally scoped to a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    let projectIds: string[] | null = null;
    if (workspaceId) {
      const wProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId));
      projectIds = wProjects.map((p) => p.id);
    }

    const result = await db.query.tasks.findMany({
      where: projectIds !== null && projectIds.length > 0
        ? and(eq(tasks.assigneeId, session.user.id), inArray(tasks.projectId, projectIds))
        : projectIds !== null && projectIds.length === 0
          ? undefined // no tasks in workspace → return empty
          : eq(tasks.assigneeId, session.user.id),
      columns: { id: true, title: true, projectId: true },
      with: {
        project: { columns: { id: true, name: true, color: true } },
      },
      orderBy: (tasks, { asc }) => [asc(tasks.title)],
    });

    if (projectIds !== null && projectIds.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get my-tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
