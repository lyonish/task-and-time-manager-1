import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export class ActivityService {
  static async getByWorkspaceId(workspaceId: string, limit = 50) {
    return db.query.activityLogs.findMany({
      where: eq(activityLogs.workspaceId, workspaceId),
      orderBy: [desc(activityLogs.createdAt)],
      limit,
      with: {
        user: true,
        project: true,
        task: true,
      },
    });
  }

  static async getByProjectId(projectId: string, limit = 50) {
    return db.query.activityLogs.findMany({
      where: eq(activityLogs.projectId, projectId),
      orderBy: [desc(activityLogs.createdAt)],
      limit,
      with: {
        user: true,
        task: true,
      },
    });
  }

  static async getByTaskId(taskId: string, limit = 50) {
    return db.query.activityLogs.findMany({
      where: eq(activityLogs.taskId, taskId),
      orderBy: [desc(activityLogs.createdAt)],
      limit,
      with: {
        user: true,
      },
    });
  }

  static async getByUserId(
    userId: string,
    workspaceId: string,
    limit = 50
  ) {
    return db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.workspaceId, workspaceId)
      ),
      orderBy: [desc(activityLogs.createdAt)],
      limit,
      with: {
        project: true,
        task: true,
      },
    });
  }
}
