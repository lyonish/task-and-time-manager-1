"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface CommentItemProps {
  comment: Comment;
  isAuthor: boolean;
}

// Render @mentions as highlighted text
function renderContent(content: string) {
  // Replace @[Name](userId) with highlighted name
  const parts = content.split(/(@\[([^\]]+)\]\([^)]+\))/g);

  return parts.map((part, i) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      return (
        <span
          key={i}
          className="text-primary font-medium bg-primary/10 px-1 rounded"
        >
          @{mentionMatch[1]}
        </span>
      );
    }
    return part;
  });
}

export function CommentItem({ comment, isAuthor }: CommentItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      router.refresh();
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const initials = comment.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="group flex gap-3">
      <Avatar className="h-8 w-8 mt-0.5">
        <AvatarImage src={comment.author.avatarUrl || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.author.name}</span>
          <span className="text-xs text-muted-foreground">
            {comment.createdAt && formatDate(comment.createdAt)}
          </span>

          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isDeleting}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <Pencil className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm mt-1 whitespace-pre-wrap">
          {renderContent(comment.content)}
        </p>
      </div>
    </div>
  );
}
