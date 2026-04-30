import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { userGroups, userGroupMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/workspaces/[workspaceId]/groups/[groupId]/members — add member by userId
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId, groupId } = await params;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await db.query.userGroups.findFirst({
      where: and(eq(userGroups.id, groupId), eq(userGroups.workspaceId, workspaceId)),
    });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Must be a workspace member
    const isMember = await WorkspaceService.isMember(workspaceId, userId);
    if (!isMember) return NextResponse.json({ error: "User is not a workspace member" }, { status: 400 });

    await db.insert(userGroupMembers)
      .values({ groupId, userId })
      .onDuplicateKeyUpdate({ set: { groupId } });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true, email: true, avatarUrl: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[workspaceId]/groups/[groupId]/members?userId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId, groupId } = await params;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await db.query.userGroups.findFirst({
      where: and(eq(userGroups.id, groupId), eq(userGroups.workspaceId, workspaceId)),
    });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (group.isDefault) return NextResponse.json({ error: "Cannot remove members from default group" }, { status: 400 });

    await db.delete(userGroupMembers).where(
      and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
