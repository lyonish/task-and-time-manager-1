"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddTask } from "./QuickAddTask";

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
  layerId: string | null;
  parentTaskId: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  estimatedHours: string | null;
  updatedAt?: Date | null;
  priority: "None" | "Low" | "Medium" | "High" | "Urgent";
  assignee?: { id: string; name: string; avatarUrl: string | null } | null;
  steps?: Step[];
}

interface KanbanBoardProps {
  projectId: string;
  statuses: Status[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  Urgent: "#ef4444",
  High:   "#f97316",
  Medium: "#eab308",
  Low:    "#9ca3af",
  None:   "transparent",
};

function KanbanCard({
  task,
  onTaskClick,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onTaskClick: (t: Task) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const completedSteps = task.steps?.filter((s) => s.isCompleted).length ?? 0;
  const totalSteps = task.steps?.length ?? 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onTaskClick(task)}
      className={cn(
        "group relative bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-primary/40 hover:shadow-sm transition-all select-none",
        isDragging && "opacity-40"
      )}
    >
      {/* Priority bar */}
      {task.priority !== "None" && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ backgroundColor: priorityColors[task.priority] }}
        />
      )}

      <p className="text-sm font-medium leading-snug pl-2">{task.title}</p>

      {/* Footer row */}
      {(totalSteps > 0 || task.dueDate || task.assignee) && (
        <div className="flex items-center gap-2 mt-2 pl-2">
          {totalSteps > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              {completedSteps}/{totalSteps}
            </span>
          )}
          {task.dueDate && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs",
              isOverdue ? "text-red-500" : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
          {task.assignee && (
            <span className="ml-auto flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shrink-0">
              {task.assignee.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function KanbanBoard({ projectId, statuses, tasks, onTaskClick }: KanbanBoardProps) {
  const router = useRouter();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Build columns: statuses + a "No Status" column if needed
  const noStatusTasks = tasks.filter((t) => !t.statusId);
  const columns = [
    ...statuses.map((s) => ({
      id: s.id,
      label: s.name,
      color: s.color,
      tasks: tasks.filter((t) => t.statusId === s.id),
    })),
    ...(noStatusTasks.length > 0
      ? [{ id: "no-status", label: "No Status", color: "#9ca3af", tasks: noStatusTasks }]
      : []),
  ];

  const handleDrop = useCallback(
    async (targetStatusId: string) => {
      if (!draggedTaskId) return;
      const newStatusId = targetStatusId === "no-status" ? null : targetStatusId;
      setDraggedTaskId(null);
      setDragOverColId(null);

      await fetch(`/api/tasks/${draggedTaskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: newStatusId }),
      });
      router.refresh();
    },
    [draggedTaskId, router]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
      {columns.map((col) => {
        const isOver = dragOverColId === col.id;
        return (
          <div
            key={col.id}
            className={cn(
              "flex flex-col shrink-0 w-64 rounded-lg border border-border bg-muted/30 transition-colors",
              isOver && "border-primary/50 bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id); }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverColId(null);
              }
            }}
            onDrop={() => handleDrop(col.id)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              {col.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
              )}
              <span className="text-sm font-medium flex-1 truncate">{col.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{col.tasks.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
              {col.tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  isDragging={draggedTaskId === task.id}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => { setDraggedTaskId(null); setDragOverColId(null); }}
                />
              ))}
            </div>

            {/* Add task */}
            <div className="p-1 border-t border-border">
              <QuickAddTask
                projectId={projectId}
                statusId={col.id === "no-status" ? undefined : col.id}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
