import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { updateMemberRoleSchema } from "@/lib/validations/workspace";

type Params = { params: Promise<{ workspaceId: string; memberId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    const workspace = await WorkspaceService.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwner = workspace.ownerId === session.user.id;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!isOwner && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot change the owner's role
    if (memberId === workspace.ownerId) {
      return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Admins cannot promote others to Admin (only Owner can)
    if (!isOwner && parsed.data.role === "Admin") {
      return NextResponse.json(
        { error: "Only the owner can assign the Admin role" },
        { status: 403 }
      );
    }

    const members = await WorkspaceService.updateMemberRole(
      workspaceId,
      memberId,
      parsed.data.role,
      session.user.id
    );
    return NextResponse.json(members);
  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    const workspace = await WorkspaceService.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Cannot remove the owner
    if (memberId === workspace.ownerId) {
      return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 400 });
    }

    // Allow self-removal OR Admin/Owner action
    const isSelf = memberId === session.user.id;
    const isOwner = workspace.ownerId === session.user.id;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!isSelf && !isOwner && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await WorkspaceService.removeMember(workspaceId, memberId, session.user.id);
    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
