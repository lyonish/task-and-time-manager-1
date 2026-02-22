import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StepService } from "@/services/step.service";
import { TaskService } from "@/services/task.service";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { z } from "zod";

const createStepSchema = z.object({
  title: z.string().min(1).max(500),
  statusId: z.string().uuid().optional(), // If not provided, uses task's current status
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

const reorderSchema = z.object({
  statusId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()),
});

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

    // Verify task exists and user has access
    const task = await TaskService.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await ProjectService.getById(task.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await WorkspaceService.isMember(
      project.workspaceId,
      session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all steps for this task (grouped by status)
    const steps = await StepService.getSteps(taskId);
    return NextResponse.json(steps);
  } catch (error) {
    console.error("Get steps error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Verify task exists and user has access
    const task = await TaskService.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await ProjectService.getById(task.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await WorkspaceService.isMember(
      project.workspaceId,
      session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStepSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Use task's current status if statusId not provided
    const statusId = parsed.data.statusId || task.statusId;
    if (!statusId) {
      return NextResponse.json(
        { error: "Task has no status and no statusId provided" },
        { status: 400 }
      );
    }

    const step = await StepService.createStep(taskId, {
      ...parsed.data,
      statusId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error("Create step error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Verify task exists and user has access
    const task = await TaskService.getById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await ProjectService.getById(task.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await WorkspaceService.isMember(
      project.workspaceId,
      session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const steps = await StepService.reorderSteps(
      taskId,
      parsed.data.statusId,
      parsed.data.orderedIds
    );
    return NextResponse.json(steps);
  } catch (error) {
    console.error("Reorder steps error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
