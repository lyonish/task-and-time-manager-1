import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { userGroups, userGroupMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId } = await params;
    if (!await WorkspaceService.isMember(workspaceId, session.user.id))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const groups = await db.query.userGroups.findMany({
      where: eq(userGroups.workspaceId, workspaceId),
      with: {
        members: {
          with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
      orderBy: (t, { asc, desc }) => [desc(t.isDefault), asc(t.name)],
    });
    return NextResponse.json(groups);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { workspaceId } = await params;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!role || role === "Member" || role === "Guest")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const id = crypto.randomUUID();
    await db.insert(userGroups).values({ id, workspaceId, name: name.trim(), isDefault: false });
    const group = await db.query.userGroups.findFirst({
      where: eq(userGroups.id, id),
      with: { members: { with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } } } },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
