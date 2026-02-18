import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { WorkflowService } from "@/services/workflow.service";
import { z } from "zod";

const createStatusSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isDefault: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await ProjectService.getById(projectId);
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

    const statuses = await WorkflowService.getStatuses(projectId);
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Get statuses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await ProjectService.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user can manage workflow (Admin or Project_Manager)
    const role = await WorkspaceService.getMemberRole(
      project.workspaceId,
      session.user.id
    );
    if (!role || role === "Team_Member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const status = await WorkflowService.createStatus(projectId, parsed.data);
    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error("Create status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await ProjectService.getById(projectId);
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
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const statuses = await WorkflowService.reorderStatuses(
      projectId,
      parsed.data.orderedIds
    );
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Reorder statuses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
