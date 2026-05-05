import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { TaskService } from "@/services/task.service";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await TaskService.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isMember = await WorkspaceService.isMember(
      task.project!.workspaceId,
      session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.taskId, taskId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get task activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
