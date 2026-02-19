import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StepService } from "@/services/step.service";
import { TaskService } from "@/services/task.service";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { z } from "zod";

const updateStepSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isCompleted: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; stepId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, stepId } = await params;

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

    // Verify step exists and belongs to this task
    const existingStep = await StepService.getById(stepId);
    if (!existingStep || existingStep.taskId !== taskId) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateStepSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = {
      ...parsed.data,
      dueDate: parsed.data.dueDate === null
        ? null
        : parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : undefined,
    };

    const step = await StepService.updateStep(stepId, updateData);
    return NextResponse.json(step);
  } catch (error) {
    console.error("Update step error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; stepId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, stepId } = await params;

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

    // Verify step exists and belongs to this task
    const existingStep = await StepService.getById(stepId);
    if (!existingStep || existingStep.taskId !== taskId) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    await StepService.deleteStep(stepId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete step error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
