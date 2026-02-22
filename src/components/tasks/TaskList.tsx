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
import { ChevronDown, ChevronRight, Layers, List, GitBranch } from "lucide-react";
import { TaskTreeView } from "./TaskTreeView";
import { Button } from "@/components/ui/button";

interface Status {
  id: string;
  name: string;
  color: string | null;
  isCompleted: boolean | null;
}

interface Layer {
  id: string;
  name: string;
  color: string | null;
  position: number;
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
  priority: "None" | "Low" | "Medium" | "High" | "Urgent";
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  status?: Status | null;
  layer?: Layer | null;
  steps?: Step[];
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
  layers: Layer[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

type GroupBy = "none" | "status" | "priority" | "assignee" | "layer";
type ViewMode = "list" | "tree";

const priorityOrder = ["Urgent", "High", "Medium", "Low", "None"] as const;
const priorityColors: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#9ca3af",
  None: "#6b7280",
};

interface Group {
  key: string;
  label: string;
  color: string | null;
  tasks: Task[];
}

export function TaskList({ projectId, statuses, layers, tasks, members, currentUserId }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
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

    if (groupBy === "layer") {
      const groups: Group[] = layers.map((layer) => ({
        key: layer.id,
        label: layer.name,
        color: layer.color,
        tasks: tasks.filter((t) => t.layerId === layer.id),
      }));
      const noLayer = tasks.filter((t) => !t.layerId);
      if (noLayer.length > 0) {
        groups.push({ key: "no-layer", label: "No Layer", color: "#9ca3af", tasks: noLayer });
      }
      return groups;
    }

    return [{ key: "all", label: "", color: null, tasks }];
  };

  const groups = getGroups();

  return (
    <>
      <div className="p-6 space-y-4">
        {/* View Controls */}
        <div className="flex items-center justify-between">
          {/* Group By Selector */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select
              value={groupBy}
              onValueChange={(v) => {
                setGroupBy(v as GroupBy);
                if (v !== "layer") setViewMode("list");
              }}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
                <SelectItem value="layer">Layer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle - only show when grouped by layer */}
          {groupBy === "layer" && (
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "tree" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("tree")}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Tree
              </Button>
            </div>
          )}
        </div>

        {/* Task View */}
        {viewMode === "tree" ? (
          <TaskTreeView
            tasks={tasks}
            layers={layers}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <>
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
          </>
        )}

        <QuickAddTask projectId={projectId} />
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        statuses={statuses}
        layers={layers}
        tasks={tasks}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
