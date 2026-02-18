"use client";

import { useState } from "react";
import { TaskRow } from "./TaskRow";
import { QuickAddTask } from "./QuickAddTask";
import { TaskDetailPanel } from "./TaskDetailPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

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

type GroupBy = "none" | "status" | "priority" | "assignee";

const priorityOrder = ["Urgent", "High", "Medium", "Low", "None"] as const;
const priorityColors: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#3b82f6",
  None: "#9ca3af",
};

interface Group {
  key: string;
  label: string;
  color: string | null;
  tasks: Task[];
}

export function TaskList({ projectId, statuses, tasks, members, currentUserId }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getGroups = (): Group[] => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", color: null, tasks }];
    }

    if (groupBy === "status") {
      const groups: Group[] = statuses.map((status) => ({
        key: status.id,
        label: status.name,
        color: status.color,
        tasks: tasks.filter((t) => t.statusId === status.id),
      }));
      const noStatus = tasks.filter((t) => !t.statusId);
      if (noStatus.length > 0) {
        groups.push({ key: "no-status", label: "No Status", color: "#9ca3af", tasks: noStatus });
      }
      return groups;
    }

    if (groupBy === "priority") {
      return priorityOrder.map((priority) => ({
        key: priority,
        label: priority,
        color: priorityColors[priority],
        tasks: tasks.filter((t) => t.priority === priority),
      }));
    }

    if (groupBy === "assignee") {
      const groups: Group[] = members.map((member) => ({
        key: member.id,
        label: member.name,
        color: null,
        tasks: tasks.filter((t) => t.assigneeId === member.id),
      }));
      const unassigned = tasks.filter((t) => !t.assigneeId);
      if (unassigned.length > 0) {
        groups.unshift({ key: "unassigned", label: "Unassigned", color: "#9ca3af", tasks: unassigned });
      }
      return groups;
    }

    return [{ key: "all", label: "", color: null, tasks }];
  };

  const groups = getGroups();

  return (
    <>
      <div className="p-6 space-y-4">
        {/* Group By Selector */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="assignee">Assignee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task Groups */}
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key);
          const showHeader = groupBy !== "none";

          return (
            <div key={group.key} className="space-y-1">
              {showHeader && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent rounded-md transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  {group.color && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span className="font-medium">{group.label}</span>
                  <span className="text-sm text-muted-foreground">
                    ({group.tasks.length})
                  </span>
                </button>
              )}

              {!isCollapsed && (
                <div className={showHeader ? "space-y-1 ml-6" : "space-y-1"}>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      statuses={statuses}
                      members={members}
                      onClick={() => handleTaskClick(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <QuickAddTask projectId={projectId} />
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
