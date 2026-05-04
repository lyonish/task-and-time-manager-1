import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { ScheduleStatsService, getPeriodBounds } from "@/services/schedule-stats.service";
import { db } from "@/lib/db";
import { userGroups, userGroupMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    if (!(await WorkspaceService.isMember(workspaceId, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const periodParam = searchParams.get("period") as "week" | "month" | null;
    const groupId = searchParams.get("groupId");

    const date = dateParam ? new Date(dateParam) : new Date();
    const periodType: "week" | "month" = periodParam === "month" ? "month" : "week";
    const { start, end } = getPeriodBounds(date, periodType);

    // Get member IDs that the current user leads in this workspace
    const memberableIds = await WorkspaceService.getMemberableUserIds(workspaceId, session.user.id);

    if (memberableIds.length === 0) {
      return NextResponse.json({ period: { start, end, type: periodType }, members: [] });
    }

    // Optionally filter by groupId
    let filteredIds = memberableIds;
    if (groupId) {
      const group = await db.query.userGroups.findFirst({
        where: and(eq(userGroups.id, groupId), eq(userGroups.workspaceId, workspaceId)),
        with: { members: { columns: { userId: true } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      const groupMemberIds = new Set(group.members.map((m) => m.userId));
      filteredIds = memberableIds.filter((id) => groupMemberIds.has(id));
    }

    // Fetch user info for the filtered member IDs
    const memberUsers = await db.query.users.findMany({
      where: (u, { inArray }) => inArray(u.id, filteredIds),
      columns: { id: true, name: true, avatarUrl: true },
    });

    const teamStats = await ScheduleStatsService.getTeamStats(filteredIds, start, end);

    const members = memberUsers.map((u) => {
      const s = teamStats.get(u.id) ?? { totalMinutes: 0, byProject: [], byAction: [] };
      return {
        user: u,
        totalMinutes: s.totalMinutes,
        byProject: s.byProject,
        byAction: s.byAction,
      };
    });

    return NextResponse.json({ period: { start, end, type: periodType }, members });
  } catch (error) {
    console.error("Get workspace schedule stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
