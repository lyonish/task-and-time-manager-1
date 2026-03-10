import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { addMemberSchema } from "@/lib/validations/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workspace = await WorkspaceService.getById(workspaceId);
    const members = await WorkspaceService.getMembers(workspaceId);

    // Annotate each member with isOwner flag
    return NextResponse.json(
      members.map((m) => ({ ...m, isOwner: m.userId === workspace?.ownerId }))
    );
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const workspace = await WorkspaceService.getById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwner = workspace.ownerId === session.user.id;
    const role = await WorkspaceService.getMemberRole(workspaceId, session.user.id);
    if (!isOwner && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const members = await WorkspaceService.addMember(
      workspaceId,
      parsed.data,
      session.user.id
    );
    return NextResponse.json(members, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "User not found" || message === "User is already a member" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
