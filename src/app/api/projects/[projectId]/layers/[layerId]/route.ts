import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { LayerService } from "@/services/layer.service";
import { z } from "zod";

const updateLayerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; layerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, layerId } = await params;

    const layer = await LayerService.getLayerById(layerId);
    if (!layer || layer.projectId !== projectId) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    const project = await import("@/services/project.service").then(
      (m) => m.ProjectService.getById(projectId)
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await WorkspaceService.getMemberRole(
      project.workspaceId,
      session.user.id
    );
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLayerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedLayer = await LayerService.updateLayer(layerId, parsed.data);
    return NextResponse.json(updatedLayer);
  } catch (error) {
    console.error("Update layer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; layerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, layerId } = await params;

    const layer = await LayerService.getLayerById(layerId);
    if (!layer || layer.projectId !== projectId) {
      return NextResponse.json({ error: "Layer not found" }, { status: 404 });
    }

    const project = await import("@/services/project.service").then(
      (m) => m.ProjectService.getById(projectId)
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await WorkspaceService.getMemberRole(
      project.workspaceId,
      session.user.id
    );
    if (!role || role === "Member" || role === "Guest") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await LayerService.deleteLayer(layerId);
    return NextResponse.json({ message: "Layer deleted" });
  } catch (error) {
    console.error("Delete layer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
