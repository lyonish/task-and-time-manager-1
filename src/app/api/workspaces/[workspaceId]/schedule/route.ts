import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { WorkLogService } from "@/services/work-log.service";
import { db } from "@/lib/db";
import { userGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId } = await params;

    if (!await WorkspaceService.isMember(workspaceId, session.user.id))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const groupId = searchParams.get("groupId");

    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.query.userGroups.findFirst({
      where: and(eq(userGroups.id, groupId), eq(userGroups.workspaceId, workspaceId)),
      with: {
        members: {
          with: { user: { columns: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const date = dateParam ? new Date(dateParam) : new Date();

    const members = await Promise.all(
      group.members.map(async (m) => ({
        user: m.user,
        logs: await WorkLogService.getForDate(date, m.userId),
      }))
    );

    return NextResponse.json({ group: { id: group.id, name: group.name }, members });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
