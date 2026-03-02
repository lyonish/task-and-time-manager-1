import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkLogService } from "@/services/work-log.service";
import { z } from "zod";

const updateWorkLogSchema = z.object({
  taskId: z.string().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { logId } = await params;

    const isOwner = await WorkLogService.isOwner(logId, session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateWorkLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const log = await WorkLogService.update(logId, {
      taskId: parsed.data.taskId,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
      endTime: parsed.data.endTime !== undefined
        ? parsed.data.endTime ? new Date(parsed.data.endTime) : null
        : undefined,
      note: parsed.data.note,
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Update work log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { logId } = await params;

    const isOwner = await WorkLogService.isOwner(logId, session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await WorkLogService.delete(logId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete work log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
