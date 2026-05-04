import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReviewService } from "@/services/review.service";
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
    const revieweeId = searchParams.get("revieweeId");
    const periodType = searchParams.get("periodType");
    const periodStartStr = searchParams.get("periodStart");
    const periodEndStr = searchParams.get("periodEnd");

    if (!revieweeId || !periodType || !periodStartStr || !periodEndStr) {
      return NextResponse.json({ error: "revieweeId, periodType, periodStart, periodEnd required" }, { status: 400 });
    }

    const periodStart = new Date(periodStartStr);
    const periodEnd = new Date(periodEndStr);

    const comments = await ReviewService.getComments(
      revieweeId,
      session.user.id,
      periodType,
      periodStart,
      periodEnd
    );

    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET /api/review-comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      revieweeId: string;
      periodType: "week" | "month";
      periodStart: string;
      periodEnd: string;
      taskId?: string | null;
      actionType?: string | null;
      content: string;
    };

    const { revieweeId, periodType, periodStart: periodStartStr, periodEnd: periodEndStr, taskId, actionType, content } = body;

    if (!revieweeId || !periodType || !periodStartStr || !periodEndStr || !content) {
      return NextResponse.json({ error: "revieweeId, periodType, periodStart, periodEnd, content required" }, { status: 400 });
    }

    // If commenting on another user's stats, verify leader relationship
    if (revieweeId !== session.user.id) {
      const workspaceId = await getFirstWorkspaceId(session.user.id);
      if (!workspaceId) {
        return NextResponse.json({ error: "No workspace found" }, { status: 403 });
      }
      const isLeader = await WorkspaceService.isLeaderOf(workspaceId, session.user.id, revieweeId);
      if (!isLeader) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const comment = await ReviewService.addComment(
      session.user.id,
      revieweeId,
      periodType,
      new Date(periodStartStr),
      new Date(periodEndStr),
      taskId ?? null,
      actionType ?? null,
      content
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/review-comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
