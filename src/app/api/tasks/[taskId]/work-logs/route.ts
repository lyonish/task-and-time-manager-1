import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkLogService } from "@/services/work-log.service";
import { TaskService } from "@/services/task.service";
import { WorkspaceService } from "@/services/workspace.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // TaskService.getById already loads the project relation
    const task = await TaskService.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const workspaceId = task.project?.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await WorkLogService.getForTask(taskId);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get task work logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
