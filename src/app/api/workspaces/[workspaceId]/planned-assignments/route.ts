import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { PlannedAssignmentService } from "@/services/planned-assignment.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate query params are required" },
        { status: 400 }
      );
    }

    const assignments = await PlannedAssignmentService.getForPeriod(
      workspaceId,
      startDate,
      endDate
    );

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Get planned assignments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, projectId, title, startDate, endDate, estimatedHours, note } = body;

    if (!userId || !title || !startDate || !endDate || estimatedHours == null) {
      return NextResponse.json(
        { error: "Missing required fields: userId, title, startDate, endDate, estimatedHours" },
        { status: 400 }
      );
    }

    const assignment = await PlannedAssignmentService.create({
      workspaceId,
      userId,
      projectId,
      title,
      startDate,
      endDate,
      estimatedHours: Number(estimatedHours),
      note,
      createdBy: session.user.id,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Create planned assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
