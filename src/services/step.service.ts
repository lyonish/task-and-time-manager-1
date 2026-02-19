import { db } from "@/lib/db";
import { steps } from "@/lib/db/schema";
import { eq, asc, max } from "drizzle-orm";

export interface CreateStepData {
  title: string;
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
  static async getSteps(taskId: string) {
    return db.query.steps.findMany({
      where: eq(steps.taskId, taskId),
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
      },
    });
  }

  static async createStep(taskId: string, data: CreateStepData) {
    // Get the next position
    const result = await db
      .select({ maxPosition: max(steps.position) })
      .from(steps)
      .where(eq(steps.taskId, taskId));

    const nextPosition = (result[0]?.maxPosition ?? -1) + 1;

    const [step] = await db
      .insert(steps)
      .values({
        taskId,
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
    return this.getById(stepId);
  }

  static async deleteStep(stepId: string) {
    await db.delete(steps).where(eq(steps.id, stepId));
  }

  static async reorderSteps(taskId: string, orderedIds: string[]) {
    // Update positions based on the order of IDs
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(steps).set({ position: index }).where(eq(steps.id, id))
      )
    );

    return this.getSteps(taskId);
  }

  static async toggleComplete(stepId: string) {
    const step = await this.getById(stepId);
    if (!step) return null;

    await db
      .update(steps)
      .set({ isCompleted: !step.isCompleted })
      .where(eq(steps.id, stepId));

    return this.getById(stepId);
  }
}
