import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkLogService } from "@/services/work-log.service";
import { z } from "zod";

const createWorkLogSchema = z.object({
  taskId: z.string().nullable().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const date = dateParam ? new Date(dateParam) : new Date();

    const logs = await WorkLogService.getForDate(date, session.user.id);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get work logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWorkLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const log = await WorkLogService.create(
      {
        taskId: parsed.data.taskId,
        startTime: new Date(parsed.data.startTime),
        endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
        note: parsed.data.note,
      },
      session.user.id
    );

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Create work log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
