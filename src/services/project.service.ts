import { db } from "@/lib/db";
import {
  projects,
  workflowStatuses,
  taskLayers,
  activityLogs,
  tasks,
} from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateWorkflowStatusInput,
  UpdateWorkflowStatusInput,
} from "@/lib/validations/project";

const DEFAULT_STATUSES = [
  { name: "To Do", color: "#9ca3af", isDefault: true, isCompleted: false },
  { name: "In Progress", color: "#3b82f6", isDefault: false, isCompleted: false },
  { name: "Done", color: "#22c55e", isDefault: false, isCompleted: true },
];

export class ProjectService {
  static async create(
    workspaceId: string,
    data: CreateProjectInput,
    userId: string
  ) {
    const projectId = crypto.randomUUID();

    await db.insert(projects).values({
      id: projectId,
      workspaceId,
      name: data.name,
      description: data.description,
      color: data.color,
      createdBy: userId,
    });

    // Create default workflow statuses
    for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
      const status = DEFAULT_STATUSES[i];
      await db.insert(workflowStatuses).values({
        projectId,
        name: status.name,
        color: status.color,
        position: i,
        isDefault: status.isDefault,
        isCompleted: status.isCompleted,
      });
    }

    // Log activity
    const workspace = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (workspace) {
      await db.insert(activityLogs).values({
        workspaceId,
        projectId,
        userId,
        action: "project_created",
        metadata: { projectName: data.name },
      });
    }

    return this.getById(projectId);
  }

  static async getById(id: string) {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        workspace: true,
        creator: true,
        workflowStatuses: {
          orderBy: [asc(workflowStatuses.position)],
        },
      },
    });
  }

  static async getByWorkspaceId(workspaceId: string) {
    return db.query.projects.findMany({
      where: eq(projects.workspaceId, workspaceId),
      orderBy: [asc(projects.name)],
      with: {
        workflowStatuses: {
          orderBy: [asc(workflowStatuses.position)],
        },
      },
    });
  }

  static async update(id: string, data: UpdateProjectInput, userId: string) {
    const project = await this.getById(id);
    if (!project) throw new Error("Project not found");

    await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: project.workspaceId,
      projectId: id,
      userId,
      action: "project_updated",
      metadata: { changes: data },
    });

    return this.getById(id);
  }

  static async delete(id: string) {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Workflow Status methods
  static async getStatuses(projectId: string) {
    return db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, projectId),
      orderBy: [asc(workflowStatuses.position)],
    });
  }

  static async createStatus(projectId: string, data: CreateWorkflowStatusInput) {
    // Get max position
    const existingStatuses = await this.getStatuses(projectId);
    const maxPosition = Math.max(...existingStatuses.map((s) => s.position), -1);

    const statusId = crypto.randomUUID();
    await db.insert(workflowStatuses).values({
      id: statusId,
      projectId,
      name: data.name,
      color: data.color,
      position: maxPosition + 1,
      isDefault: data.isDefault,
      isCompleted: data.isCompleted,
    });

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(workflowStatuses)
        .set({ isDefault: false })
        .where(
          and(
            eq(workflowStatuses.projectId, projectId),
            eq(workflowStatuses.isDefault, true)
          )
        );
      await db
        .update(workflowStatuses)
        .set({ isDefault: true })
        .where(eq(workflowStatuses.id, statusId));
    }

    return this.getStatuses(projectId);
  }

  static async updateStatus(
    statusId: string,
    data: UpdateWorkflowStatusInput
  ) {
    const status = await db.query.workflowStatuses.findFirst({
      where: eq(workflowStatuses.id, statusId),
    });

    if (!status) throw new Error("Status not found");

    await db
      .update(workflowStatuses)
      .set(data)
      .where(eq(workflowStatuses.id, statusId));

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(workflowStatuses)
        .set({ isDefault: false })
        .where(
          and(
            eq(workflowStatuses.projectId, status.projectId),
            eq(workflowStatuses.isDefault, true)
          )
        );
      await db
        .update(workflowStatuses)
        .set({ isDefault: true })
        .where(eq(workflowStatuses.id, statusId));
    }

    return this.getStatuses(status.projectId);
  }

  static async deleteStatus(statusId: string) {
    const status = await db.query.workflowStatuses.findFirst({
      where: eq(workflowStatuses.id, statusId),
    });

    if (!status) throw new Error("Status not found");

    // Get default status to move tasks to
    const defaultStatus = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.projectId, status.projectId),
        eq(workflowStatuses.isDefault, true)
      ),
    });

    // Move tasks to default status
    if (defaultStatus && defaultStatus.id !== statusId) {
      await db
        .update(tasks)
        .set({ statusId: defaultStatus.id })
        .where(eq(tasks.statusId, statusId));
    }

    await db.delete(workflowStatuses).where(eq(workflowStatuses.id, statusId));

    return this.getStatuses(status.projectId);
  }

  static async reorderStatuses(projectId: string, statusIds: string[]) {
    for (let i = 0; i < statusIds.length; i++) {
      await db
        .update(workflowStatuses)
        .set({ position: i })
        .where(eq(workflowStatuses.id, statusIds[i]));
    }

    return this.getStatuses(projectId);
  }

  static async getProjectWithTasks(projectId: string) {
    return db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        workspace: true,
        workflowStatuses: {
          orderBy: [asc(workflowStatuses.position)],
        },
        taskLayers: {
          orderBy: [asc(taskLayers.position)],
        },
        tasks: {
          with: {
            assignee: true,
            status: true,
            layer: true,
          },
          orderBy: [asc(tasks.position)],
        },
      },
    });
  }
}
