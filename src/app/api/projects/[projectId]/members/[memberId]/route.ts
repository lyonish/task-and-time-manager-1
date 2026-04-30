import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { getProjectRole } from "@/lib/projectAccess";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId, memberId } = await params;

    const project = await ProjectService.getById(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const callerRole = await getProjectRole(projectId, session.user.id);
    if (callerRole !== "Owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const entry = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)),
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { role } = await req.json();
    if (!["Owner", "Editor", "Viewer"].includes(role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    await db.update(projectMembers).set({ role }).where(eq(projectMembers.id, memberId));
    return NextResponse.json({ ...entry, role });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId, memberId } = await params;

    const project = await ProjectService.getById(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const callerRole = await getProjectRole(projectId, session.user.id);
    if (callerRole !== "Owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const entry = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)),
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prevent removing the last Owner
    if (entry.role === "Owner") {
      const ownerCount = await db.query.projectMembers.findMany({
        where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "Owner")),
      });
      if (ownerCount.length <= 1)
        return NextResponse.json({ error: "Cannot remove the last Owner" }, { status: 400 });
    }

    await db.delete(projectMembers).where(eq(projectMembers.id, memberId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
