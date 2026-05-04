import { db } from "@/lib/db";
import { workLogReviewComments } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export class ReviewService {
  /**
   * Get comments for a (reviewee, period) visible to currentUserId.
   *
   * Privacy rule:
   * - If currentUserId === revieweeId: return all comments where revieweeId = currentUserId
   *   (the member sees every comment on their own stats from any author)
   * - Otherwise (a leader viewing): return comments where
   *   revieweeId = revieweeId AND (authorId = currentUserId OR authorId = revieweeId)
   *   (leader sees their own comments + the member's replies)
   */
  static async getComments(
    revieweeId: string,
    currentUserId: string,
    periodType: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    if (currentUserId === revieweeId) {
      // Member views their own stats — see all comments addressed to them
      return db.query.workLogReviewComments.findMany({
        where: and(
          eq(workLogReviewComments.revieweeId, revieweeId),
          eq(workLogReviewComments.periodType, periodType as "week" | "month"),
          eq(workLogReviewComments.periodStart, periodStart),
          eq(workLogReviewComments.periodEnd, periodEnd)
        ),
        with: {
          author: { columns: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      });
    } else {
      // Leader views member's stats — see own comments + member's replies
      return db.query.workLogReviewComments.findMany({
        where: and(
          eq(workLogReviewComments.revieweeId, revieweeId),
          eq(workLogReviewComments.periodType, periodType as "week" | "month"),
          eq(workLogReviewComments.periodStart, periodStart),
          eq(workLogReviewComments.periodEnd, periodEnd),
          or(
            eq(workLogReviewComments.authorId, currentUserId),
            eq(workLogReviewComments.authorId, revieweeId)
          )
        ),
        with: {
          author: { columns: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      });
    }
  }

  static async addComment(
    authorId: string,
    revieweeId: string,
    periodType: "week" | "month",
    periodStart: Date,
    periodEnd: Date,
    taskId: string | null,
    actionType: string | null,
    content: string
  ) {
    const id = crypto.randomUUID();
    await db.insert(workLogReviewComments).values({
      id,
      authorId,
      revieweeId,
      periodType,
      periodStart,
      periodEnd,
      taskId: taskId ?? null,
      actionType: actionType ?? null,
      content,
    });
    return db.query.workLogReviewComments.findFirst({
      where: eq(workLogReviewComments.id, id),
      with: { author: { columns: { id: true, name: true, avatarUrl: true } } },
    });
  }

  static async updateComment(commentId: string, content: string) {
    await db
      .update(workLogReviewComments)
      .set({ content })
      .where(eq(workLogReviewComments.id, commentId));
    return db.query.workLogReviewComments.findFirst({
      where: eq(workLogReviewComments.id, commentId),
      with: { author: { columns: { id: true, name: true, avatarUrl: true } } },
    });
  }

  static async deleteComment(commentId: string) {
    await db.delete(workLogReviewComments).where(eq(workLogReviewComments.id, commentId));
  }

  static async isAuthor(commentId: string, userId: string): Promise<boolean> {
    const comment = await db.query.workLogReviewComments.findFirst({
      where: and(
        eq(workLogReviewComments.id, commentId),
        eq(workLogReviewComments.authorId, userId)
      ),
      columns: { id: true },
    });
    return !!comment;
  }
}
