import { db } from "@/lib/db";
import { comments, mentions, activityLogs, tasks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CreateCommentInput, UpdateCommentInput } from "@/lib/validations/comment";

// Parse @mentions from content - matches @[Name](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export class CommentService {
  static parseMentions(content: string): string[] {
    const mentionIds: string[] = [];
    let match;
    while ((match = MENTION_REGEX.exec(content)) !== null) {
      mentionIds.push(match[2]);
    }
    return mentionIds;
  }

  static async create(
    taskId: string,
    data: CreateCommentInput,
    userId: string
  ) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: { project: true },
    });

    if (!task) throw new Error("Task not found");

    const commentId = crypto.randomUUID();

    await db.insert(comments).values({
      id: commentId,
      taskId,
      authorId: userId,
      content: data.content,
    });

    // Parse and create mentions
    const mentionIds = this.parseMentions(data.content);
    for (const mentionedUserId of mentionIds) {
      await db.insert(mentions).values({
        commentId,
        mentionedUserId,
      });

      // Log mention activity
      await db.insert(activityLogs).values({
        workspaceId: task.project!.workspaceId,
        projectId: task.projectId,
        taskId,
        userId,
        action: "mention_created",
        metadata: { mentionedUserId, commentId },
      });
    }

    // Log comment activity
    await db.insert(activityLogs).values({
      workspaceId: task.project!.workspaceId,
      projectId: task.projectId,
      taskId,
      userId,
      action: "comment_added",
      metadata: { commentId },
    });

    return this.getById(commentId);
  }

  static async getById(id: string) {
    return db.query.comments.findFirst({
      where: eq(comments.id, id),
      with: {
        author: true,
        mentions: {
          with: {
            mentionedUser: true,
          },
        },
      },
    });
  }

  static async getByTaskId(taskId: string) {
    return db.query.comments.findMany({
      where: eq(comments.taskId, taskId),
      orderBy: [desc(comments.createdAt)],
      with: {
        author: true,
        mentions: {
          with: {
            mentionedUser: true,
          },
        },
      },
    });
  }

  static async update(id: string, data: UpdateCommentInput, userId: string) {
    const comment = await this.getById(id);
    if (!comment) throw new Error("Comment not found");

    // Only author can edit
    if (comment.authorId !== userId) {
      throw new Error("Forbidden");
    }

    await db
      .update(comments)
      .set({
        content: data.content,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id));

    // Handle updated mentions
    // First, delete existing mentions
    await db.delete(mentions).where(eq(mentions.commentId, id));

    // Create new mentions
    const mentionIds = this.parseMentions(data.content);
    for (const mentionedUserId of mentionIds) {
      await db.insert(mentions).values({
        commentId: id,
        mentionedUserId,
      });
    }

    return this.getById(id);
  }

  static async delete(id: string, userId: string) {
    const comment = await this.getById(id);
    if (!comment) throw new Error("Comment not found");

    // Only author can delete
    if (comment.authorId !== userId) {
      throw new Error("Forbidden");
    }

    await db.delete(comments).where(eq(comments.id, id));
  }
}
