import { db } from "@/lib/db";
import { workLogs } from "@/lib/db/schema";
import { eq, and, gte, lt, or, isNull, isNotNull } from "drizzle-orm";

export interface CreateWorkLogInput {
  taskId?: string | null;
  estimatedStartTime?: Date | null;
  estimatedEndTime?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  note?: string | null;
  detailNote?: string | null;
}

export interface UpdateWorkLogInput {
  taskId?: string | null;
  estimatedStartTime?: Date | null;
  estimatedEndTime?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  note?: string | null;
  detailNote?: string | null;
}

export class WorkLogService {
  static async getForDate(date: Date, userId: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const rows = await db.query.workLogs.findMany({
      where: and(
        eq(workLogs.userId, userId),
        or(
          and(isNotNull(workLogs.startTime), gte(workLogs.startTime, start), lt(workLogs.startTime, end)),
          and(isNull(workLogs.startTime), isNotNull(workLogs.estimatedStartTime), gte(workLogs.estimatedStartTime, start), lt(workLogs.estimatedStartTime, end))
        )
      ),
      with: {
        task: {
          columns: { id: true, title: true, projectId: true },
          with: {
            project: { columns: { id: true, name: true, color: true } },
          },
        },
      },
    });

    // Sort: actual entries first by actualStart asc; estimate-only (no actual) → bottom by estimatedStart asc
    return rows.sort((a, b) => {
      const aActual = a.startTime;
      const bActual = b.startTime;
      if (!aActual && !bActual) {
        return (a.estimatedStartTime?.getTime() ?? 0) - (b.estimatedStartTime?.getTime() ?? 0);
      }
      if (!aActual) return 1;
      if (!bActual) return -1;
      return aActual.getTime() - bActual.getTime();
    });
  }

  static async getForTask(taskId: string) {
    return db.query.workLogs.findMany({
      where: eq(workLogs.taskId, taskId),
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: (workLogs, { desc }) => [desc(workLogs.startTime)],
    });
  }

  static async getById(id: string) {
    return db.query.workLogs.findFirst({
      where: eq(workLogs.id, id),
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true } },
        task: {
          columns: { id: true, title: true, projectId: true },
          with: {
            project: { columns: { id: true, name: true, color: true } },
          },
        },
      },
    });
  }

  static async create(data: CreateWorkLogInput, userId: string) {
    const id = crypto.randomUUID();
    await db.insert(workLogs).values({
      id,
      userId,
      taskId: data.taskId ?? null,
      estimatedStartTime: data.estimatedStartTime ?? null,
      estimatedEndTime: data.estimatedEndTime ?? null,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      note: data.note ?? null,
      detailNote: data.detailNote ?? null,
    });
    return this.getById(id);
  }

  static async update(id: string, data: UpdateWorkLogInput) {
    await db
      .update(workLogs)
      .set({
        ...(data.taskId !== undefined && { taskId: data.taskId }),
        ...(data.estimatedStartTime !== undefined && { estimatedStartTime: data.estimatedStartTime }),
        ...(data.estimatedEndTime !== undefined && { estimatedEndTime: data.estimatedEndTime }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.detailNote !== undefined && { detailNote: data.detailNote }),
      })
      .where(eq(workLogs.id, id));
    return this.getById(id);
  }

  static async delete(id: string) {
    await db.delete(workLogs).where(eq(workLogs.id, id));
  }

  static async isOwner(id: string, userId: string): Promise<boolean> {
    const log = await db.query.workLogs.findFirst({
      where: and(eq(workLogs.id, id), eq(workLogs.userId, userId)),
      columns: { id: true },
    });
    return !!log;
  }
}
