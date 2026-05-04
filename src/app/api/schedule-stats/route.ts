import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ScheduleStatsService, getPeriodBounds } from "@/services/schedule-stats.service";
import { WorkspaceService } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getFirstWorkspaceId(userId: string): Promise<string | null> {
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
    columns: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const periodParam = searchParams.get("period") as "week" | "month" | null;
    const userIdParam = searchParams.get("userId");

    const date = dateParam ? new Date(dateParam) : new Date();
    const periodType: "week" | "month" = periodParam === "month" ? "month" : "week";

    // Determine which user's stats to fetch
    let targetUserId = session.user.id;

    if (userIdParam && userIdParam !== session.user.id) {
      // Leader is viewing a member's stats — verify the relationship
      const workspaceId = await getFirstWorkspaceId(session.user.id);
      if (!workspaceId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const isLeader = await WorkspaceService.isLeaderOf(workspaceId, session.user.id, userIdParam);
      if (!isLeader) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetUserId = userIdParam;
    }

    const { start, end } = getPeriodBounds(date, periodType);
    const [stats, matrixResult] = await Promise.all([
      ScheduleStatsService.getPersonalStats(targetUserId, start, end),
      ScheduleStatsService.getMatrix(targetUserId, start, end),
    ]);

    return NextResponse.json({
      period: { start, end, type: periodType },
      stats,
      matrix: matrixResult.rows,
      actionTypes: matrixResult.actionTypes,
    });
  } catch (error) {
    console.error("Get schedule stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
