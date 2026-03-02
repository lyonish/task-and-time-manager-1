import { db } from "@/lib/db";
import { workLogs } from "@/lib/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";

export interface CreateWorkLogInput {
  taskId?: string | null;
  startTime: Date;
  endTime?: Date | null;
  note?: string | null;
}

export interface UpdateWorkLogInput {
  taskId?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  note?: string | null;
}

export class WorkLogService {
  // Get own work logs for a date
  static async getForDate(date: Date, userId: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return db.query.workLogs.findMany({
      where: and(
        eq(workLogs.userId, userId),
        gte(workLogs.startTime, start),
        lt(workLogs.startTime, end)
      ),
      with: {
        task: {
          columns: { id: true, title: true, projectId: true },
          with: {
            project: { columns: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: (workLogs, { asc }) => [asc(workLogs.startTime)],
    });
  }

  // Get all work logs for a specific task (all members)
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
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      note: data.note ?? null,
    });
    return this.getById(id);
  }

  static async update(id: string, data: UpdateWorkLogInput) {
    await db
      .update(workLogs)
      .set({
        ...(data.taskId !== undefined && { taskId: data.taskId }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.note !== undefined && { note: data.note }),
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
