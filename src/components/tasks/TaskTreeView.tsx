"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";

interface Layer {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface Step {
  id: string;
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
  layer?: Layer | null;
  steps?: Step[];
}

interface TaskTreeViewProps {
  tasks: Task[];
  layers: Layer[];
  onTaskClick?: (task: Task) => void;
}

interface TreeNode {
  task: Task;
  children: TreeNode[];
  depth: number;
}

const priorityColors: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#9ca3af",
  None: "#6b7280",
};

function buildTree(tasks: Task[]): { tree: TreeNode[]; unlayered: Task[] } {
  // Separate layered and unlayered tasks
  const layeredTasks = tasks.filter((t) => t.layerId);
  const unlayeredTasks = tasks.filter((t) => !t.layerId);

  const taskMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes for layered tasks only
  layeredTasks.forEach((task) => {
    taskMap.set(task.id, { task, children: [], depth: 0 });
  });

  // Build tree structure
  layeredTasks.forEach((task) => {
    const node = taskMap.get(task.id)!;
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      const parent = taskMap.get(task.parentTaskId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate depths
  function setDepths(nodes: TreeNode[], depth: number) {
    nodes.forEach((node) => {
      node.depth = depth;
      setDepths(node.children, depth + 1);
    });
  }
  setDepths(roots, 0);

  return { tree: roots, unlayered: unlayeredTasks };
}

function TreeNodeComponent({
  node,
  onTaskClick,
  isLast,
  parentLayerPosition,
  activeLines,
}: {
  node: TreeNode;
  onTaskClick?: (task: Task) => void;
  isLast: boolean;
  parentLayerPosition: number;
  activeLines: Map<number, boolean>; // layer position -> has continuing line
}) {
  const { task, children } = node;
  const layerPosition = task.layer?.position ?? 0;
  const isRoot = parentLayerPosition < 0;

  const INDENT_WIDTH = 28; // w-7 = 28px

  return (
    <div className="relative">
      <div className="flex items-center">
        {/* Render columns for each layer level up to current */}
        {Array.from({ length: layerPosition }).map((_, colIndex) => {
          const isParentColumn = colIndex === parentLayerPosition;
          const hasActiveLine = activeLines.get(colIndex);
          const isLastColumn = colIndex === layerPosition - 1;

          return (
            <div key={colIndex} className="w-7 flex-shrink-0 relative h-10">
              {/* Vertical continuation line from ancestors */}
              {hasActiveLine && !isParentColumn && (
                <div className="absolute left-[13px] top-0 bottom-0 w-px bg-border" />
              )}

              {/* L-connector at parent's column */}
              {isParentColumn && !isRoot && (
                <>
                  {/* Vertical line from top */}
                  <div className="absolute left-[13px] top-0 h-5 w-px bg-border" />
                  {/* Horizontal line going right */}
                  <div
                    className="absolute left-[13px] top-5 h-px bg-border"
                    style={{ width: INDENT_WIDTH * (layerPosition - parentLayerPosition) - 8 }}
                  />
                  {/* Continue vertical if not last sibling */}
                  {!isLast && (
                    <div className="absolute left-[13px] top-5 bottom-0 w-px bg-border" />
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Task node */}
        <button
          onClick={() => onTaskClick?.(task)}
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left flex-1 min-w-0",
            layerPosition === 0 && "font-medium"
          )}
        >
          {/* Priority dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={
              task.priority === "None"
                ? { border: "1.5px solid #6b7280" }
                : { backgroundColor: priorityColors[task.priority] }
            }
          />

          {/* Title */}
          <span className="truncate flex-1">{task.title}</span>

          {/* Children count - fixed width for alignment */}
          <span className="text-xs text-muted-foreground flex-shrink-0 w-6 text-center">
            {children.length > 0 ? `(${children.length})` : ""}
          </span>

          {/* Step progress - fixed width for alignment */}
          <div className="flex items-center gap-1.5 w-24 flex-shrink-0" title={task.steps && task.steps.length > 0 ? `${task.steps.filter(s => s.isCompleted).length}/${task.steps.length} steps` : "No steps"}>
            {task.steps && task.steps.length > 0 ? (
              <>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(task.steps.filter(s => s.isCompleted).length / task.steps.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {task.steps.filter(s => s.isCompleted).length}/{task.steps.length}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">—</span>
            )}
          </div>

          {/* Due date - fixed width for alignment */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 w-14">
            {task.dueDate ? (
              <>
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </span>

          {/* Assignee - fixed width for alignment */}
          <div className="w-5 flex-shrink-0">
            {task.assignee ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {task.assignee.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full border border-dashed border-border opacity-30" />
            )}
          </div>
        </button>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div>
          {children.map((child, index) => {
            const isLastChild = index === children.length - 1;
            // Update active lines for children
            const newActiveLines = new Map(activeLines);
            // Current task's column has a line if this isn't the last child
            if (!isLastChild) {
              newActiveLines.set(layerPosition, true);
            } else {
              newActiveLines.delete(layerPosition);
            }
            return (
              <TreeNodeComponent
                key={child.task.id}
                node={child}
                onTaskClick={onTaskClick}
                isLast={isLastChild}
                parentLayerPosition={layerPosition}
                activeLines={newActiveLines}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskTreeView({ tasks, layers, onTaskClick }: TaskTreeViewProps) {
  const { tree, unlayered } = useMemo(() => buildTree(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks yet. Create some tasks to see the hierarchy.
      </div>
    );
  }

  return (
    <div>
      {/* Layered tasks tree */}
      {tree.map((node, index) => (
        <TreeNodeComponent
          key={node.task.id}
          node={node}
          onTaskClick={onTaskClick}
          isLast={index === tree.length - 1}
          parentLayerPosition={-1}
          activeLines={new Map()}
        />
      ))}

      {/* Unlayered tasks section */}
      {unlayered.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground mb-2 px-2">
            No Layer ({unlayered.length})
          </div>
          {unlayered.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left w-full"
            >
              {/* Priority dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={
                  task.priority === "None"
                    ? { border: "1.5px solid #6b7280" }
                    : { backgroundColor: priorityColors[task.priority] }
                }
              />

              {/* Title */}
              <span className="truncate flex-1">{task.title}</span>

              {/* Spacer for children count alignment */}
              <span className="w-6 flex-shrink-0" />

              {/* Step progress - fixed width for alignment */}
              <div className="flex items-center gap-1.5 w-24 flex-shrink-0" title={task.steps && task.steps.length > 0 ? `${task.steps.filter(s => s.isCompleted).length}/${task.steps.length} steps` : "No steps"}>
                {task.steps && task.steps.length > 0 ? (
                  <>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(task.steps.filter(s => s.isCompleted).length / task.steps.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {task.steps.filter(s => s.isCompleted).length}/{task.steps.length}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Due date - fixed width for alignment */}
              <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 w-14">
                {task.dueDate ? (
                  <>
                    <Calendar className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </span>

              {/* Assignee - fixed width for alignment */}
              <div className="w-5 flex-shrink-0">
                {task.assignee ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-dashed border-border opacity-30" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
