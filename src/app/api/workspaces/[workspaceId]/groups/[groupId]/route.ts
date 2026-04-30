import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { userGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
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
    if (group.isDefault) return NextResponse.json({ error: "Cannot rename default group" }, { status: 400 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    await db.update(userGroups).set({ name: name.trim() }).where(eq(userGroups.id, groupId));
    return NextResponse.json({ id: groupId, name: name.trim() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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
    if (group.isDefault) return NextResponse.json({ error: "Cannot delete default group" }, { status: 400 });

    await db.delete(userGroups).where(eq(userGroups.id, groupId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
