import { db } from "@/lib/db";
import { userCapacity, plannedAssignments, users, projects } from "@/lib/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";

export class PlannedAssignmentService {
  /**
   * Get all assignments for a workspace that overlap with [startDate, endDate].
   * Overlap condition: assignment.startDate <= endDate AND assignment.endDate >= startDate
   */
  static async getForPeriod(workspaceId: string, startDate: string, endDate: string) {
    const rows = await db
      .select({
        id: plannedAssignments.id,
        workspaceId: plannedAssignments.workspaceId,
        userId: plannedAssignments.userId,
        projectId: plannedAssignments.projectId,
        title: plannedAssignments.title,
        startDate: plannedAssignments.startDate,
        endDate: plannedAssignments.endDate,
        estimatedHours: plannedAssignments.estimatedHours,
        note: plannedAssignments.note,
        createdBy: plannedAssignments.createdBy,
        createdAt: plannedAssignments.createdAt,
        updatedAt: plannedAssignments.updatedAt,
        assignee: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color,
        },
      })
      .from(plannedAssignments)
      .leftJoin(users, eq(users.id, plannedAssignments.userId))
      .leftJoin(projects, eq(projects.id, plannedAssignments.projectId))
      .where(
        and(
          eq(plannedAssignments.workspaceId, workspaceId),
          lte(plannedAssignments.startDate, endDate),
          gte(plannedAssignments.endDate, startDate)
        )
      );
    return rows;
  }

  /**
   * Get capacity for a user in a workspace, returning defaults if not set.
   */
  static async getCapacity(
    userId: string,
    workspaceId: string
  ): Promise<{ hoursPerDay: number; daysPerWeek: number }> {
    const row = await db.query.userCapacity.findFirst({
      where: and(
        eq(userCapacity.userId, userId),
        eq(userCapacity.workspaceId, workspaceId)
      ),
    });

    if (!row) {
      return { hoursPerDay: 8, daysPerWeek: 5 };
    }

    return {
      hoursPerDay: parseFloat(row.hoursPerDay as string),
      daysPerWeek: row.daysPerWeek,
    };
  }

  /**
   * Set (upsert) capacity for a user in a workspace.
   */
  static async setCapacity(
    userId: string,
    workspaceId: string,
    hoursPerDay: number,
    daysPerWeek: number
  ) {
    const existing = await db.query.userCapacity.findFirst({
      where: and(
        eq(userCapacity.userId, userId),
        eq(userCapacity.workspaceId, workspaceId)
      ),
    });

    if (existing) {
      await db
        .update(userCapacity)
        .set({ hoursPerDay: String(hoursPerDay), daysPerWeek, updatedAt: new Date() })
        .where(eq(userCapacity.id, existing.id));
    } else {
      await db.insert(userCapacity).values({
        userId,
        workspaceId,
        hoursPerDay: String(hoursPerDay),
        daysPerWeek,
      });
    }

    return this.getCapacity(userId, workspaceId);
  }

  /**
   * Create a new planned assignment.
   */
  static async create(data: {
    workspaceId: string;
    userId: string;
    projectId?: string;
    title: string;
    startDate: string;
    endDate: string;
    estimatedHours: number;
    note?: string;
    createdBy: string;
  }) {
    const id = crypto.randomUUID();
    await db.insert(plannedAssignments).values({
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      projectId: data.projectId ?? null,
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      estimatedHours: String(data.estimatedHours),
      note: data.note ?? null,
      createdBy: data.createdBy,
    });
    return this.getById(id);
  }

  /**
   * Update fields on an existing planned assignment.
   */
  static async update(
    id: string,
    data: Partial<{
      title: string;
      projectId: string | null;
      startDate: string;
      endDate: string;
      estimatedHours: number;
      note: string | null;
    }>
  ) {
    await db
      .update(plannedAssignments)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.estimatedHours !== undefined && {
          estimatedHours: String(data.estimatedHours),
        }),
        ...(data.note !== undefined && { note: data.note }),
        updatedAt: new Date(),
      })
      .where(eq(plannedAssignments.id, id));

    return this.getById(id);
  }

  /**
   * Delete a planned assignment by ID.
   */
  static async delete(id: string) {
    await db.delete(plannedAssignments).where(eq(plannedAssignments.id, id));
  }

  /**
   * Get a single planned assignment by ID with relations.
   */
  static async getById(id: string) {
    const rows = await db
      .select({
        id: plannedAssignments.id,
        workspaceId: plannedAssignments.workspaceId,
        userId: plannedAssignments.userId,
        projectId: plannedAssignments.projectId,
        title: plannedAssignments.title,
        startDate: plannedAssignments.startDate,
        endDate: plannedAssignments.endDate,
        estimatedHours: plannedAssignments.estimatedHours,
        note: plannedAssignments.note,
        createdBy: plannedAssignments.createdBy,
        createdAt: plannedAssignments.createdAt,
        updatedAt: plannedAssignments.updatedAt,
        assignee: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color,
        },
      })
      .from(plannedAssignments)
      .leftJoin(users, eq(users.id, plannedAssignments.userId))
      .leftJoin(projects, eq(projects.id, plannedAssignments.projectId))
      .where(eq(plannedAssignments.id, id))
      .limit(1);
    return rows[0] ?? null;
  }
}
