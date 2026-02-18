import { db } from "@/lib/db";
import { tasks, activityLogs, projects, workflowStatuses } from "@/lib/db/schema";
import { eq, asc, and, desc } from "drizzle-orm";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/task";

export class TaskService {
  static async create(projectId: string, data: CreateTaskInput, userId: string) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) throw new Error("Project not found");

    // Get default status if not provided
    let statusId = data.statusId;
    if (!statusId) {
      const defaultStatus = await db.query.workflowStatuses.findFirst({
        where: and(
          eq(workflowStatuses.projectId, projectId),
          eq(workflowStatuses.isDefault, true)
        ),
      });
      statusId = defaultStatus?.id || null;
    }

    // Get max position for the status
    const existingTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.projectId, projectId),
        statusId ? eq(tasks.statusId, statusId) : undefined
      ),
    });
    const maxPosition = Math.max(...existingTasks.map((t) => t.position), -1);

    const taskId = crypto.randomUUID();
    await db.insert(tasks).values({
      id: taskId,
      projectId,
      statusId,
      layerId: data.layerId,
      parentTaskId: data.parentTaskId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      position: maxPosition + 1,
      createdBy: userId,
    });

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: project.workspaceId,
      projectId,
      taskId,
      userId,
      action: "task_created",
      metadata: { title: data.title },
    });

    return this.getById(taskId);
  }

  static async getById(id: string) {
    return db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        project: true,
        assignee: true,
        creator: true,
        status: true,
        layer: true,
        comments: {
          with: {
            author: true,
          },
          orderBy: [desc(tasks.createdAt)],
        },
      },
    });
  }

  static async getByProjectId(projectId: string) {
    return db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      orderBy: [asc(tasks.position)],
      with: {
        assignee: true,
        status: true,
      },
    });
  }

  static async getByAssigneeId(userId: string) {
    return db.query.tasks.findMany({
      where: eq(tasks.assigneeId, userId),
      orderBy: [desc(tasks.createdAt)],
      with: {
        project: true,
        status: true,
      },
    });
  }

  static async update(id: string, data: UpdateTaskInput, userId: string) {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found");

    const updates: Record<string, unknown> = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (data.title !== undefined && data.title !== task.title) {
      updates.title = data.title;
      changes.title = { old: task.title, new: data.title };
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    if (data.priority !== undefined && data.priority !== task.priority) {
      updates.priority = data.priority;
      changes.priority = { old: task.priority, new: data.priority };
    }
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      if (task.dueDate?.toISOString() !== data.dueDate) {
        changes.dueDate = { old: task.dueDate, new: data.dueDate };
      }
    }
    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      updates.assigneeId = data.assigneeId;
      changes.assigneeId = { old: task.assigneeId, new: data.assigneeId };
    }
    if (data.layerId !== undefined && data.layerId !== task.layerId) {
      updates.layerId = data.layerId;
      changes.layerId = { old: task.layerId, new: data.layerId };
    }
    if (data.parentTaskId !== undefined && data.parentTaskId !== task.parentTaskId) {
      updates.parentTaskId = data.parentTaskId;
      changes.parentTaskId = { old: task.parentTaskId, new: data.parentTaskId };
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(tasks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tasks.id, id));

      // Log activity
      await db.insert(activityLogs).values({
        workspaceId: task.project!.workspaceId,
        projectId: task.projectId,
        taskId: id,
        userId,
        action: "task_updated",
        metadata: { changes },
      });
    }

    return this.getById(id);
  }

  static async changeStatus(id: string, statusId: string, userId: string) {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found");

    const newStatus = await db.query.workflowStatuses.findFirst({
      where: eq(workflowStatuses.id, statusId),
    });

    if (!newStatus) throw new Error("Status not found");

    const oldStatusName = task.status?.name;

    // Get max position in new status
    const tasksInStatus = await db.query.tasks.findMany({
      where: and(eq(tasks.projectId, task.projectId), eq(tasks.statusId, statusId)),
    });
    const maxPosition = Math.max(...tasksInStatus.map((t) => t.position), -1);

    await db
      .update(tasks)
      .set({
        statusId,
        position: maxPosition + 1,
        completedAt: newStatus.isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: task.project!.workspaceId,
      projectId: task.projectId,
      taskId: id,
      userId,
      action: newStatus.isCompleted ? "task_completed" : "task_status_changed",
      metadata: { oldStatus: oldStatusName, newStatus: newStatus.name },
    });

    return this.getById(id);
  }

  static async assign(id: string, assigneeId: string | null, userId: string) {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found");

    await db
      .update(tasks)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(tasks.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: task.project!.workspaceId,
      projectId: task.projectId,
      taskId: id,
      userId,
      action: "task_assigned",
      metadata: { assigneeId },
    });

    return this.getById(id);
  }

  static async reorder(
    id: string,
    newStatusId: string | undefined,
    newPosition: number
  ) {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found");

    const targetStatusId = newStatusId || task.statusId;

    // Get all tasks in target status
    const tasksInStatus = await db.query.tasks.findMany({
      where: and(
        eq(tasks.projectId, task.projectId),
        targetStatusId ? eq(tasks.statusId, targetStatusId) : undefined
      ),
      orderBy: [asc(tasks.position)],
    });

    // Reorder
    const filteredTasks = tasksInStatus.filter((t) => t.id !== id);
    filteredTasks.splice(newPosition, 0, task);

    // Update positions
    for (let i = 0; i < filteredTasks.length; i++) {
      await db
        .update(tasks)
        .set({
          position: i,
          statusId: targetStatusId,
        })
        .where(eq(tasks.id, filteredTasks[i].id));
    }

    return this.getById(id);
  }

  static async delete(id: string, userId: string) {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found");

    // Log activity before deletion
    await db.insert(activityLogs).values({
      workspaceId: task.project!.workspaceId,
      projectId: task.projectId,
      userId,
      action: "task_deleted",
      metadata: { title: task.title },
    });

    await db.delete(tasks).where(eq(tasks.id, id));
  }
}
