import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { ownerId: true },
  });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (workspace.ownerId === session.user.id) {
    return NextResponse.json({ role: "Admin", isOwner: true });
  }

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { role: true },
  });

  if (!member) return NextResponse.json({ role: null, isOwner: false });
  return NextResponse.json({ role: member.role, isOwner: false });
}
