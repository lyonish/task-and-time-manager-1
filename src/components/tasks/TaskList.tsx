"use client";

import { useState } from "react";
import { TaskRow } from "./TaskRow";
import { QuickAddTask } from "./QuickAddTask";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TaskListProps {
  projectId: string;
  statuses: Status[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

export function TaskList({ projectId, statuses, tasks, members, currentUserId }: TaskListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleSection = (statusId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) {
        next.delete(statusId);
      } else {
        next.add(statusId);
      }
      return next;
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  // Group tasks by status
  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = tasks.filter((t) => t.statusId === status.id);
    return acc;
  }, {} as Record<string, Task[]>);

  // Tasks without status
  const unassignedTasks = tasks.filter((t) => !t.statusId);

  return (
    <>
      <div className="p-6 space-y-4">
        {statuses.map((status) => {
          const statusTasks = tasksByStatus[status.id] || [];
          const isCollapsed = collapsedSections.has(status.id);

          return (
            <div key={status.id} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(status.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: status.color || "#9ca3af" }}
                />
                <span className="font-medium">{status.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({statusTasks.length})
                </span>
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div className="space-y-1 ml-6">
                  {statusTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      statuses={statuses}
                      members={members}
                      onClick={() => handleTaskClick(task)}
                    />
                  ))}
                  <QuickAddTask
                    projectId={projectId}
                    statusId={status.id}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned tasks */}
        {unassignedTasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="font-medium text-muted-foreground">No Status</span>
              <span className="text-sm text-muted-foreground">
                ({unassignedTasks.length})
              </span>
            </div>
            <div className="space-y-1 ml-6">
              {unassignedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  members={members}
                  onClick={() => handleTaskClick(task)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        statuses={statuses}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
