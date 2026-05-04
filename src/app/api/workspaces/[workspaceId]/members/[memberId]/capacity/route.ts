import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { PlannedAssignmentService } from "@/services/planned-assignment.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const capacity = await PlannedAssignmentService.getCapacity(memberId, workspaceId);
    return NextResponse.json(capacity);
  } catch (error) {
    console.error("Get capacity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { hoursPerDay, daysPerWeek } = body;

    if (hoursPerDay == null || daysPerWeek == null) {
      return NextResponse.json(
        { error: "hoursPerDay and daysPerWeek are required" },
        { status: 400 }
      );
    }

    const hpd = Number(hoursPerDay);
    const dpw = Number(daysPerWeek);

    if (hpd < 1 || hpd > 24) {
      return NextResponse.json(
        { error: "hoursPerDay must be between 1 and 24" },
        { status: 400 }
      );
    }

    if (dpw < 1 || dpw > 7) {
      return NextResponse.json(
        { error: "daysPerWeek must be between 1 and 7" },
        { status: 400 }
      );
    }

    const capacity = await PlannedAssignmentService.setCapacity(
      memberId,
      workspaceId,
      hpd,
      dpw
    );

    return NextResponse.json(capacity);
  } catch (error) {
    console.error("Set capacity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
