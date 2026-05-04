import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { PlannedAssignmentService } from "@/services/planned-assignment.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, assignmentId } = await params;

    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await PlannedAssignmentService.getById(assignmentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, projectId, startDate, endDate, estimatedHours, note } = body;

    const updated = await PlannedAssignmentService.update(assignmentId, {
      ...(title !== undefined && { title }),
      ...(projectId !== undefined && { projectId }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(estimatedHours !== undefined && { estimatedHours: Number(estimatedHours) }),
      ...(note !== undefined && { note }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update planned assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, assignmentId } = await params;

    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await PlannedAssignmentService.getById(assignmentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await PlannedAssignmentService.delete(assignmentId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete planned assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
