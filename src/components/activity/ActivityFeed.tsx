"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2,
  MessageSquare,
  Plus,
  ArrowRight,
  User,
  Calendar,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import type { ActionType } from "@/types";

interface ActivityLog {
  id: string;
  action: ActionType;
  metadata: Record<string, unknown> | null;
  createdAt: Date | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  task?: {
    id: string;
    title: string;
  } | null;
}

interface ActivityFeedProps {
  activities: ActivityLog[];
}

const actionIcons: Record<ActionType, React.ReactNode> = {
  task_created: <Plus className="h-3 w-3" />,
  task_updated: <Edit className="h-3 w-3" />,
  task_deleted: <Trash2 className="h-3 w-3" />,
  task_completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  task_assigned: <User className="h-3 w-3" />,
  task_status_changed: <ArrowRight className="h-3 w-3" />,
  task_due_date_changed: <Calendar className="h-3 w-3" />,
  comment_added: <MessageSquare className="h-3 w-3" />,
  mention_created: <User className="h-3 w-3 text-primary" />,
  project_created: <Plus className="h-3 w-3" />,
  project_updated: <Edit className="h-3 w-3" />,
  member_added: <UserPlus className="h-3 w-3" />,
  member_removed: <UserMinus className="h-3 w-3" />,
  member_role_changed: <User className="h-3 w-3" />,
};

function getActionDescription(activity: ActivityLog): string {
  const metadata = activity.metadata || {};

  switch (activity.action) {
    case "task_created":
      return `created task "${activity.task?.title || metadata.title}"`;
    case "task_updated":
      return `updated task "${activity.task?.title}"`;
    case "task_deleted":
      return `deleted task "${metadata.title}"`;
    case "task_completed":
      return `completed task "${activity.task?.title}"`;
    case "task_assigned":
      return `assigned task "${activity.task?.title}"`;
    case "task_status_changed":
      return `moved task "${activity.task?.title}" from ${metadata.oldStatus} to ${metadata.newStatus}`;
    case "task_due_date_changed":
      return `changed due date for "${activity.task?.title}"`;
    case "comment_added":
      return `commented on "${activity.task?.title}"`;
    case "mention_created":
      return `mentioned someone in "${activity.task?.title}"`;
    case "project_created":
      return `created project "${activity.project?.name || metadata.projectName}"`;
    case "project_updated":
      return `updated project "${activity.project?.name}"`;
    case "member_added":
      return `added a new member`;
    case "member_removed":
      return `removed a member`;
    case "member_role_changed":
      return `changed a member's role`;
    default:
      return activity.action;
  }
}

function formatTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const initials = activity.user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div key={activity.id} className="flex gap-3">
            <Avatar className="h-8 w-8 mt-0.5">
              <AvatarImage src={activity.user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm">
                    {activity.user.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getActionDescription(activity)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="p-1 rounded bg-muted">
                  {actionIcons[activity.action]}
                </span>
                {activity.project && (
                  <span className="text-xs text-muted-foreground">
                    in {activity.project.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {activity.createdAt && formatTime(activity.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
