import { db } from "@/lib/db";
import { steps, tasks, workflowStatuses } from "@/lib/db/schema";
import { eq, and, asc, max } from "drizzle-orm";

export interface CreateStepData {
  title: string;
  statusId: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
}

export interface UpdateStepData {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | null;
  isCompleted?: boolean;
  position?: number;
}

export class StepService {
  // Get all steps for a task (across all statuses)
  static async getSteps(taskId: string) {
    return db.query.steps.findMany({
      where: eq(steps.taskId, taskId),
      orderBy: [asc(steps.statusId), asc(steps.position)],
      with: {
        assignee: true,
        status: true,
      },
    });
  }

  // Get steps for a task's current status only
  static async getStepsForCurrentStatus(taskId: string) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task?.statusId) return [];

    return db.query.steps.findMany({
      where: and(eq(steps.taskId, taskId), eq(steps.statusId, task.statusId)),
      orderBy: [asc(steps.position)],
      with: {
        assignee: true,
      },
    });
  }

  static async getById(stepId: string) {
    return db.query.steps.findFirst({
      where: eq(steps.id, stepId),
      with: {
        assignee: true,
        status: true,
      },
    });
  }

  static async createStep(taskId: string, data: CreateStepData) {
    // Get the next position for this task+status combination
    const result = await db
      .select({ maxPosition: max(steps.position) })
      .from(steps)
      .where(and(eq(steps.taskId, taskId), eq(steps.statusId, data.statusId)));

    const nextPosition = (result[0]?.maxPosition ?? -1) + 1;

    const [step] = await db
      .insert(steps)
      .values({
        taskId,
        statusId: data.statusId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        position: nextPosition,
      })
      .$returningId();

    return this.getById(step.id);
  }

  static async updateStep(stepId: string, data: UpdateStepData) {
    await db.update(steps).set(data).where(eq(steps.id, stepId));

    const step = await this.getById(stepId);

    // If step was marked complete, check if we should auto-advance
    if (data.isCompleted === true && step) {
      await this.checkAndAutoAdvance(step.taskId, step.statusId);
    }

    return step;
  }

  static async deleteStep(stepId: string) {
    await db.delete(steps).where(eq(steps.id, stepId));
  }

  static async reorderSteps(taskId: string, statusId: string, orderedIds: string[]) {
    // Update positions based on the order of IDs
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(steps).set({ position: index }).where(eq(steps.id, id))
      )
    );

    return this.getStepsForCurrentStatus(taskId);
  }

  // Check if all steps for current status are completed and auto-advance to next status
  static async checkAndAutoAdvance(taskId: string, statusId: string): Promise<boolean> {
    // Get all steps for this task+status
    const statusSteps = await db.query.steps.findMany({
      where: and(eq(steps.taskId, taskId), eq(steps.statusId, statusId)),
    });

    // If no steps or not all completed, don't advance
    if (statusSteps.length === 0) return false;
    const allCompleted = statusSteps.every((s) => s.isCompleted);
    if (!allCompleted) return false;

    // Get current task to verify it's still in this status
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });
    if (!task || task.statusId !== statusId) return false;

    // Get all statuses for this project, ordered by position
    const allStatuses = await db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, task.projectId),
      orderBy: [asc(workflowStatuses.position)],
    });

    // Find current status index and get next status
    const currentIndex = allStatuses.findIndex((s) => s.id === statusId);
    if (currentIndex === -1 || currentIndex >= allStatuses.length - 1) return false;

    const nextStatus = allStatuses[currentIndex + 1];

    // Update task to next status
    await db
      .update(tasks)
      .set({ statusId: nextStatus.id, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    return true;
  }

  // Get step counts by status for a task (for progress display)
  static async getStepCountsByStatus(taskId: string) {
    const allSteps = await this.getSteps(taskId);

    const countsByStatus: Record<string, { total: number; completed: number }> = {};

    for (const step of allSteps) {
      if (!countsByStatus[step.statusId]) {
        countsByStatus[step.statusId] = { total: 0, completed: 0 };
      }
      countsByStatus[step.statusId].total++;
      if (step.isCompleted) {
        countsByStatus[step.statusId].completed++;
      }
    }

    return countsByStatus;
  }
}
