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
import { ChevronDown, ChevronRight, Layers, List, GitBranch, Minimize2, Maximize2, LayoutDashboard, Plus, X } from "lucide-react";
import { TaskTreeView } from "./TaskTreeView";
import { KanbanBoard } from "./KanbanBoard";
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
  updatedAt?: Date | null;
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

type Filters = {
  updatedWithinDays: number | null;
  dueWithinNextDays: number | null;
};

const DEFAULT_FILTERS: Filters = { updatedWithinDays: 14, dueWithinNextDays: 14 };

interface TaskListProps {
  projectId: string;
  statuses: Status[];
  layers: Layer[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
  initialGroupBy?: GroupBy;
  initialViewMode?: ViewMode;
  initialIsCompact?: boolean;
  initialFilters?: Filters;
  onConfigChange?: (config: { groupBy: GroupBy; viewMode: ViewMode; isCompact: boolean; filters: Filters }) => void;
}

type GroupBy = "none" | "status" | "priority" | "assignee" | "layer";
type ViewMode = "list" | "tree" | "kanban";

// --- Filter chip ---
function FilterChip({
  label, prefix, suffix, value, onChange,
}: {
  label: string; prefix: string; suffix: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  if (value === null) {
    return (
      <button
        onClick={() => onChange(14)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-3 py-1 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />{label}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm bg-muted text-muted-foreground rounded-full px-3 py-1">
      <span>{label}: {prefix}</span>
      <input
        type="number"
        min={1}
        max={365}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-8 bg-transparent text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
      />
      <span>d</span>
      <button onClick={() => onChange(null)}>
        <X className="h-3.5 w-3.5 hover:text-foreground transition-colors" />
      </button>
    </span>
  );
}

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

export function TaskList({
  projectId, statuses, layers, tasks, members, currentUserId,
  initialGroupBy = "none", initialViewMode = "list", initialIsCompact = false,
  initialFilters = DEFAULT_FILTERS,
  onConfigChange,
}: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isCompact, setIsCompact] = useState(initialIsCompact);
  const [filters, setFilters] = useState<Filters>(initialFilters ?? DEFAULT_FILTERS);

  const notifyChange = (next: { groupBy: GroupBy; viewMode: ViewMode; isCompact: boolean; filters: Filters }) => {
    onConfigChange?.(next);
  };

  const updateFilter = (key: keyof Filters, value: number | null) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    notifyChange({ groupBy, viewMode, isCompact, filters: next });
  };

  // Apply date filters
  const filteredTasks = (() => {
    const now = Date.now();
    return tasks.filter((task) => {
      if (filters.updatedWithinDays !== null && task.updatedAt) {
        const cutoff = now - filters.updatedWithinDays * 86_400_000;
        if (new Date(task.updatedAt).getTime() < cutoff) return false;
      }
      if (filters.dueWithinNextDays !== null) {
        if (!task.dueDate) return false;
        const cutoff = now + filters.dueWithinNextDays * 86_400_000;
        if (new Date(task.dueDate).getTime() > cutoff) return false;
      }
      return true;
    });
  })();

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
      return [{ key: "all", label: "", color: null, tasks: filteredTasks }];
    }

    if (groupBy === "status") {
      const groups: Group[] = statuses.map((status) => ({
        key: status.id,
        label: status.name,
        color: status.color,
        tasks: filteredTasks.filter((t) => t.statusId === status.id),
      }));
      const noStatus = filteredTasks.filter((t) => !t.statusId);
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
        tasks: filteredTasks.filter((t) => t.priority === priority),
      }));
    }

    if (groupBy === "assignee") {
      const groups: Group[] = members.map((member) => ({
        key: member.id,
        label: member.name,
        color: null,
        tasks: filteredTasks.filter((t) => t.assigneeId === member.id),
      }));
      const unassigned = filteredTasks.filter((t) => !t.assigneeId);
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
        tasks: filteredTasks.filter((t) => t.layerId === layer.id),
      }));
      const noLayer = filteredTasks.filter((t) => !t.layerId);
      if (noLayer.length > 0) {
        groups.push({ key: "no-layer", label: "No Layer", color: "#9ca3af", tasks: noLayer });
      }
      return groups;
    }

    return [{ key: "all", label: "", color: null, tasks: filteredTasks }];
  };

  const groups = getGroups();

  return (
    <>
      <div className="p-6 space-y-4">
        {/* View Controls */}
        <div className="flex items-center justify-between">
          {/* Group By Selector — hidden in Kanban */}
          <div className="flex items-center gap-2">
            {viewMode === "kanban" ? (
              <span className="text-sm text-muted-foreground">Grouped by status</span>
            ) : (
              <>
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Group by:</span>
                <Select
                  value={groupBy}
                  onValueChange={(v) => {
                    const nextGroupBy = v as GroupBy;
                    const nextViewMode = v !== "layer" ? "list" : viewMode;
                    setGroupBy(nextGroupBy);
                    if (v !== "layer") setViewMode("list");
                    notifyChange({ groupBy: nextGroupBy, viewMode: nextViewMode, isCompact, filters });
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
              </>
            )}
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            {/* Compact Toggle — hidden in Kanban */}
            {viewMode !== "kanban" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  const next = !isCompact;
                  setIsCompact(next);
                  notifyChange({ groupBy, viewMode, isCompact: next, filters });
                }}
                title={isCompact ? "Normal view" : "Compact view"}
              >
                {isCompact ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* List/Tree toggle — only when grouped by layer and not kanban */}
            {groupBy === "layer" && viewMode !== "kanban" && (
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => { setViewMode("list"); notifyChange({ groupBy, viewMode: "list", isCompact, filters }); }}
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={viewMode === "tree" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => { setViewMode("tree"); notifyChange({ groupBy, viewMode: "tree", isCompact, filters }); }}
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  Tree
                </Button>
              </div>
            )}

            {/* Kanban toggle */}
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                const next: ViewMode = viewMode === "kanban" ? "list" : "kanban";
                setViewMode(next);
                notifyChange({ groupBy, viewMode: next, isCompact, filters });
              }}
              title="Kanban view"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          <FilterChip
            label="Updated"
            prefix="last"
            suffix="d"
            value={filters.updatedWithinDays}
            onChange={(v) => updateFilter("updatedWithinDays", v)}
          />
          <FilterChip
            label="Due"
            prefix="next"
            suffix="d"
            value={filters.dueWithinNextDays}
            onChange={(v) => updateFilter("dueWithinNextDays", v)}
          />
          {(filters.updatedWithinDays !== null || filters.dueWithinNextDays !== null) && (
            <span className="text-xs text-muted-foreground">
              — {filteredTasks.length} of {tasks.length} tasks
            </span>
          )}
        </div>

        {/* Task View */}
        {viewMode === "kanban" ? (
          <KanbanBoard
            projectId={projectId}
            statuses={statuses}
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        ) : viewMode === "tree" ? (
          <TaskTreeView
            tasks={filteredTasks}
            layers={layers}
            onTaskClick={handleTaskClick}
            isCompact={isCompact}
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
                          isCompact={isCompact}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {viewMode !== "kanban" && <QuickAddTask projectId={projectId} />}
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
