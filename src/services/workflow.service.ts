import { db } from "@/lib/db";
import { workflowStatuses, tasks } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

export interface CreateStatusInput {
  name: string;
  color?: string;
  isDefault?: boolean;
  isCompleted?: boolean;
}

export interface UpdateStatusInput {
  name?: string;
  color?: string;
  isDefault?: boolean;
  isCompleted?: boolean;
}

export class WorkflowService {
  static async getStatuses(projectId: string) {
    return db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, projectId),
      orderBy: [asc(workflowStatuses.position)],
    });
  }

  static async getStatusById(id: string) {
    return db.query.workflowStatuses.findFirst({
      where: eq(workflowStatuses.id, id),
    });
  }

  static async createStatus(projectId: string, data: CreateStatusInput) {
    // Get max position
    const existing = await this.getStatuses(projectId);
    const maxPosition = Math.max(...existing.map((s) => s.position), -1);

    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(workflowStatuses)
        .set({ isDefault: false })
        .where(eq(workflowStatuses.projectId, projectId));
    }

    const statusId = crypto.randomUUID();
    await db.insert(workflowStatuses).values({
      id: statusId,
      projectId,
      name: data.name,
      color: data.color || "#9ca3af",
      position: maxPosition + 1,
      isDefault: data.isDefault || false,
      isCompleted: data.isCompleted || false,
    });

    return this.getStatusById(statusId);
  }

  static async updateStatus(id: string, data: UpdateStatusInput) {
    const status = await this.getStatusById(id);
    if (!status) throw new Error("Status not found");

    // If this is being marked as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(workflowStatuses)
        .set({ isDefault: false })
        .where(eq(workflowStatuses.projectId, status.projectId));
    }

    await db
      .update(workflowStatuses)
      .set({
        name: data.name ?? status.name,
        color: data.color ?? status.color,
        isDefault: data.isDefault ?? status.isDefault,
        isCompleted: data.isCompleted ?? status.isCompleted,
      })
      .where(eq(workflowStatuses.id, id));

    return this.getStatusById(id);
  }

  static async deleteStatus(id: string) {
    const status = await this.getStatusById(id);
    if (!status) throw new Error("Status not found");

    // Check if any tasks use this status
    const tasksWithStatus = await db.query.tasks.findMany({
      where: eq(tasks.statusId, id),
    });

    if (tasksWithStatus.length > 0) {
      // Move tasks to another status or set to null
      const otherStatus = await db.query.workflowStatuses.findFirst({
        where: and(
          eq(workflowStatuses.projectId, status.projectId),
          eq(workflowStatuses.isDefault, true)
        ),
      });

      await db
        .update(tasks)
        .set({ statusId: otherStatus?.id || null })
        .where(eq(tasks.statusId, id));
    }

    await db.delete(workflowStatuses).where(eq(workflowStatuses.id, id));
  }

  static async reorderStatuses(projectId: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(workflowStatuses)
        .set({ position: i })
        .where(eq(workflowStatuses.id, orderedIds[i]));
    }

    return this.getStatuses(projectId);
  }
}
