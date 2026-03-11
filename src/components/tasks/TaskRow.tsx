"use client";
// test triggering a build
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

interface Step {
  id: string;
  statusId: string;
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
  steps?: Step[];
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
  isCompact?: boolean;
}

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-gray-400",
  None: "bg-foreground",
};

export function TaskRow({ task, statuses, members, onClick, isCompact = false }: TaskRowProps) {
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
        "group flex items-center gap-3 px-3 rounded-md hover:bg-accent transition-colors",
        isCompact ? "py-1 gap-2" : "py-2",
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
          "flex-1 truncate text-left hover:text-primary transition-colors",
          isCompact ? "text-xs" : "text-sm",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </button>

      {/* Step progress - fixed width for alignment (shows overall progress) */}
      {(() => {
        const allSteps = task.steps || [];
        const completedCount = allSteps.filter(s => s.isCompleted).length;
        const totalCount = allSteps.length;
        return (
          <div
            className="flex items-center gap-1.5 w-28 flex-shrink-0"
            title={totalCount > 0 ? `${completedCount}/${totalCount} steps completed` : "No steps"}
          >
            {totalCount > 0 ? (
              <>
                <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(completedCount / totalCount) * 100}%`,
                    }}
                  />
                </div>
                <span className={cn(
                  "text-muted-foreground",
                  isCompact ? "text-[9px]" : "text-[10px]"
                )}>
                  {completedCount}/{totalCount}
                </span>
              </>
            ) : (
              <span className={cn(
                "text-muted-foreground/50",
                isCompact ? "text-[9px]" : "text-[10px]"
              )}>—</span>
            )}
          </div>
        );
      })()}

      {/* Priority indicator */}
      <span
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          task.priority === "None" ? "border-[1.5px] border-gray-500" : priorityColors[task.priority]
        )}
        title={task.priority}
      />

      {/* Due Date - fixed width for alignment */}
      <span
        className={cn(
          "flex items-center gap-1 w-16 flex-shrink-0",
          isCompact ? "text-[10px]" : "text-xs",
          task.dueDate && isOverdue ? "text-red-500" : "text-muted-foreground"
        )}
      >
        {task.dueDate ? (
          <>
            <Calendar className="h-3 w-3" />
            {formatDueDate(task.dueDate)}
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </span>

      {/* Assignee - fixed width for alignment */}
      <div className="w-6 flex-shrink-0">
        {task.assignee ? (
          <Avatar className={isCompact ? "h-5 w-5" : "h-6 w-6"}>
            <AvatarImage src={task.assignee.avatarUrl || undefined} />
            <AvatarFallback className={isCompact ? "text-[9px]" : "text-xs"}>
              {task.assignee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn(
            "rounded-full border-2 border-dashed border-border flex items-center justify-center opacity-30",
            isCompact ? "h-5 w-5" : "h-6 w-6"
          )}>
            <User className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
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
