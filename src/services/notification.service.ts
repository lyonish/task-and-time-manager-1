import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

type NotificationType = "comment_added" | "task_assigned" | "mention";

interface CreateNotificationInput {
  userId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  taskId?: string;
  projectId?: string;
}

export class NotificationService {
  static async create(input: CreateNotificationInput) {
    if (input.userId === input.actorId) return; // don't notify yourself
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      ...input,
    });
  }

  static async getForUser(userId: string, limit = 30) {
    return db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        taskId: notifications.taskId,
        projectId: notifications.projectId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actor: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  static async countUnread(userId: string) {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  }

  static async markRead(id: string, userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  static async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }
}
