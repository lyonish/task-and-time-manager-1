"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MoreHorizontal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Status {
  id: string;
  name: string;
  color: string | null;
  isCompleted: boolean | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  priority: "None" | "Low" | "Medium" | "High" | "Urgent";
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  status?: Status | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TaskRowProps {
  task: Task;
  statuses: Status[];
  members: Member[];
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
  None: "",
};

export function TaskRow({ task, statuses, members, onClick }: TaskRowProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const isCompleted = task.status?.isCompleted;

  const handleStatusChange = async (statusId: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      router.refresh();
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update task status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    const completedStatus = statuses.find((s) => s.isCompleted);
    if (completedStatus) {
      await handleStatusChange(completedStatus.id);
    }
  };

  const formatDueDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
        isUpdating && "opacity-50 pointer-events-none"
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isCompleted || false}
        onCheckedChange={handleComplete}
        disabled={isUpdating || !!isCompleted}
      />

      {/* Title */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 text-sm truncate text-left hover:text-primary transition-colors",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </button>

      {/* Priority indicator */}
      {task.priority !== "None" && (
        <span
          className={cn("w-2 h-2 rounded-full", priorityColors[task.priority])}
          title={task.priority}
        />
      )}

      {/* Due Date */}
      {task.dueDate && (
        <span
          className={cn(
            "text-xs flex items-center gap-1",
            isOverdue ? "text-red-500" : "text-muted-foreground"
          )}
        >
          <Calendar className="h-3 w-3" />
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Assignee */}
      {task.assignee ? (
        <Avatar className="h-6 w-6">
          <AvatarImage src={task.assignee.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {task.assignee.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <User className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statuses.map((status) => (
            <DropdownMenuItem
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              disabled={status.id === task.statusId}
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: status.color || "#9ca3af" }}
              />
              Move to {status.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
