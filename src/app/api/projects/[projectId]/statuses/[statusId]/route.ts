import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { WorkflowService } from "@/services/workflow.service";
import { z } from "zod";

const updateStatusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isDefault: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, statusId } = await params;

    const status = await WorkflowService.getStatusById(statusId);
    if (!status || status.projectId !== projectId) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    // Check permissions
    const project = await import("@/services/project.service").then(
      (m) => m.ProjectService.getById(projectId)
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await WorkspaceService.getMemberRole(
      project.workspaceId,
      session.user.id
    );
    if (!role || role === "Team_Member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedStatus = await WorkflowService.updateStatus(
      statusId,
      parsed.data
    );
    return NextResponse.json(updatedStatus);
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; statusId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, statusId } = await params;

    const status = await WorkflowService.getStatusById(statusId);
    if (!status || status.projectId !== projectId) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    // Check permissions
    const project = await import("@/services/project.service").then(
      (m) => m.ProjectService.getById(projectId)
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await WorkspaceService.getMemberRole(
      project.workspaceId,
      session.user.id
    );
    if (!role || role === "Team_Member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await WorkflowService.deleteStatus(statusId);
    return NextResponse.json({ message: "Status deleted" });
  } catch (error) {
    console.error("Delete status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
