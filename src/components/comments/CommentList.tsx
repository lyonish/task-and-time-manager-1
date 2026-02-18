"use client";

import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";

interface Comment {
  id: string;
  content: string;
  createdAt: Date | null;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface CommentListProps {
  taskId: string;
  comments: Comment[];
  members: Member[];
  currentUserId: string;
}

export function CommentList({
  taskId,
  comments,
  members,
  currentUserId,
}: CommentListProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments ({comments.length})</h3>

      <CommentForm taskId={taskId} members={members} />

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isAuthor={comment.author.id === currentUserId}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
}
