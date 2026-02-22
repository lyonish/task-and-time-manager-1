"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ChevronRight, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  layer?: Layer | null;
  steps?: Step[];
}

interface TaskTreeViewProps {
  tasks: Task[];
  layers: Layer[];
  onTaskClick?: (task: Task) => void;
  isCompact?: boolean;
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
  isCompact = false,
  collapsedNodes,
  onToggleCollapse,
  maxVisibleLayerPosition,
}: {
  node: TreeNode;
  onTaskClick?: (task: Task) => void;
  isLast: boolean;
  parentLayerPosition: number;
  activeLines: Map<number, boolean>; // layer position -> has continuing line
  isCompact?: boolean;
  collapsedNodes: Set<string>;
  onToggleCollapse: (taskId: string) => void;
  maxVisibleLayerPosition: number | null;
}) {
  const { task, children } = node;
  const layerPosition = task.layer?.position ?? 0;
  const isRoot = parentLayerPosition < 0;

  const INDENT_WIDTH = 28; // w-7 = 28px
  const ROW_HEIGHT = isCompact ? "h-8" : "h-10";
  const VERTICAL_MID = isCompact ? "top-4" : "top-5";
  const VERTICAL_TOP_HEIGHT = isCompact ? "h-4" : "h-5";
  const isCollapsed = collapsedNodes.has(task.id);

  // Filter children based on max visible layer
  const visibleChildren = maxVisibleLayerPosition !== null
    ? children.filter(child => (child.task.layer?.position ?? 0) <= maxVisibleLayerPosition)
    : children;
  const hasChildren = visibleChildren.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center">
        {/* Render columns for each layer level up to current */}
        {Array.from({ length: layerPosition }).map((_, colIndex) => {
          const isParentColumn = colIndex === parentLayerPosition;
          const hasActiveLine = activeLines.get(colIndex);
          const isLastColumn = colIndex === layerPosition - 1;

          return (
            <div key={colIndex} className={cn(
              "w-7 flex-shrink-0 relative",
              ROW_HEIGHT
            )}>
              {/* Vertical continuation line from ancestors */}
              {hasActiveLine && !isParentColumn && (
                <div className="absolute left-[13px] top-0 bottom-0 w-px bg-border" />
              )}

              {/* L-connector at parent's column */}
              {isParentColumn && !isRoot && (
                <>
                  {/* Vertical line from top */}
                  <div className={cn("absolute left-[13px] top-0 w-px bg-border", VERTICAL_TOP_HEIGHT)} />
                  {/* Horizontal line going right */}
                  <div
                    className={cn("absolute left-[13px] h-px bg-border", VERTICAL_MID)}
                    style={{ width: INDENT_WIDTH * (layerPosition - parentLayerPosition) - 8 }}
                  />
                  {/* Continue vertical if not last sibling */}
                  {!isLast && (
                    <div className={cn("absolute left-[13px] bottom-0 w-px bg-border", VERTICAL_MID)} />
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Task node */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 rounded-md hover:bg-accent transition-colors text-left flex-1 min-w-0",
            isCompact ? "py-1 text-xs" : "py-2 text-sm",
            layerPosition === 0 && "font-medium"
          )}
        >
          {/* Collapse/Expand chevron */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(task.id);
              }}
              className="p-0.5 -ml-1 rounded hover:bg-accent-foreground/10 flex-shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
              ) : (
                <ChevronDown className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
              )}
            </button>
          ) : (
            <span className={cn("flex-shrink-0", isCompact ? "w-4" : "w-5")} />
          )}

          {/* Clickable area for task details */}
          <button
            onClick={() => onTaskClick?.(task)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
            <span className="truncate flex-1 text-left">{task.title}</span>

            {/* Children count - fixed width for alignment */}
            <span className={cn(
              "text-muted-foreground flex-shrink-0 w-6 text-center",
              isCompact ? "text-[9px]" : "text-xs"
            )}>
              {visibleChildren.length > 0 ? `(${visibleChildren.length})` : ""}
            </span>

          {/* Step progress - fixed width for alignment (shows overall progress) */}
            {(() => {
              const allSteps = task.steps || [];
              const completedCount = allSteps.filter(s => s.isCompleted).length;
              const totalCount = allSteps.length;
              return (
                <div
                  className="flex items-center gap-1.5 w-24 flex-shrink-0"
                  title={totalCount > 0 ? `${completedCount}/${totalCount} steps completed` : "No steps"}
                >
                  {totalCount > 0 ? (
                    <>
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
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

            {/* Due date - fixed width for alignment */}
            <span className={cn(
              "flex items-center gap-1 text-muted-foreground flex-shrink-0 w-14",
              isCompact ? "text-[10px]" : "text-xs"
            )}>
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
                <Avatar className={isCompact ? "h-4 w-4" : "h-5 w-5"}>
                  <AvatarImage src={task.assignee.avatarUrl || undefined} />
                  <AvatarFallback className={isCompact ? "text-[8px]" : "text-[10px]"}>
                    {task.assignee.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className={cn(
                  "rounded-full border border-dashed border-border opacity-30",
                  isCompact ? "h-4 w-4" : "h-5 w-5"
                )} />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div>
          {visibleChildren.map((child, index) => {
            const isLastChild = index === visibleChildren.length - 1;
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
                isCompact={isCompact}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={onToggleCollapse}
                maxVisibleLayerPosition={maxVisibleLayerPosition}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper to collect task IDs that should be collapsed for "expand down to layer X"
// Tasks AT the target layer or below should be collapsed (their children hidden)
function getTaskIdsToCollapseForLayer(nodes: TreeNode[], targetLayerPosition: number): string[] {
  const ids: string[] = [];
  function collect(node: TreeNode) {
    const layerPos = node.task.layer?.position ?? 0;
    // Collapse tasks that are at or below the target layer (so their children are hidden)
    if (layerPos >= targetLayerPosition && node.children.length > 0) {
      ids.push(node.task.id);
    }
    node.children.forEach(collect);
  }
  nodes.forEach(collect);
  return ids;
}

// Helper to get all task IDs with children (for collapse all)
function getAllParentTaskIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  function collect(node: TreeNode) {
    if (node.children.length > 0) {
      ids.push(node.task.id);
    }
    node.children.forEach(collect);
  }
  nodes.forEach(collect);
  return ids;
}

export function TaskTreeView({ tasks, layers, onTaskClick, isCompact = false }: TaskTreeViewProps) {
  const { tree, unlayered } = useMemo(() => buildTree(tasks), [tasks]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [maxVisibleLayerPosition, setMaxVisibleLayerPosition] = useState<number | null>(null);

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.position - b.position),
    [layers]
  );

  const toggleCollapse = (taskId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedNodes(new Set());
    setMaxVisibleLayerPosition(null);
  };

  const collapseAll = () => {
    const allIds = getAllParentTaskIds(tree);
    setCollapsedNodes(new Set(allIds));
    setMaxVisibleLayerPosition(null);
  };

  // Expand down to a specific layer - show tasks up to that layer only
  const expandDownToLayer = (layerPosition: number) => {
    setCollapsedNodes(new Set()); // Expand all nodes
    setMaxVisibleLayerPosition(layerPosition); // But filter to only show up to this layer
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks yet. Create some tasks to see the hierarchy.
      </div>
    );
  }

  return (
    <div>
      {/* Layer-level fold controls */}
      {sortedLayers.length > 0 && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                Fold
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={expandAll}>
                Expand all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={collapseAll}>
                Collapse all
              </DropdownMenuItem>
              {sortedLayers.map((layer) => (
                <DropdownMenuItem
                  key={`expand-to-${layer.id}`}
                  onClick={() => expandDownToLayer(layer.position)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: layer.color || "#9ca3af" }}
                  />
                  Expand down to {layer.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Layered tasks tree */}
      {tree
        .filter((node) =>
          maxVisibleLayerPosition === null ||
          (node.task.layer?.position ?? 0) <= maxVisibleLayerPosition
        )
        .map((node, index, filteredTree) => (
          <TreeNodeComponent
            key={node.task.id}
            node={node}
            onTaskClick={onTaskClick}
            isLast={index === filteredTree.length - 1}
            parentLayerPosition={-1}
            activeLines={new Map()}
            isCompact={isCompact}
            collapsedNodes={collapsedNodes}
            onToggleCollapse={toggleCollapse}
            maxVisibleLayerPosition={maxVisibleLayerPosition}
          />
        ))}

      {/* Unlayered tasks section */}
      {unlayered.length > 0 && (
        <div className={cn("border-t border-border", isCompact ? "mt-4 pt-3" : "mt-6 pt-4")}>
          <div className={cn(
            "text-muted-foreground mb-2 px-2",
            isCompact ? "text-xs" : "text-sm"
          )}>
            No Layer ({unlayered.length})
          </div>
          {unlayered.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                "flex items-center gap-2 px-2 rounded-md hover:bg-accent transition-colors text-left w-full",
                isCompact ? "py-1 text-xs" : "py-2 text-sm"
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

              {/* Spacer for children count alignment */}
              <span className="w-6 flex-shrink-0" />

              {/* Step progress - fixed width for alignment (shows overall progress) */}
              {(() => {
                const allSteps = task.steps || [];
                const completedCount = allSteps.filter(s => s.isCompleted).length;
                const totalCount = allSteps.length;
                return (
                  <div
                    className="flex items-center gap-1.5 w-24 flex-shrink-0"
                    title={totalCount > 0 ? `${completedCount}/${totalCount} steps completed` : "No steps"}
                  >
                    {totalCount > 0 ? (
                      <>
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
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

              {/* Due date - fixed width for alignment */}
              <span className={cn(
                "flex items-center gap-1 text-muted-foreground flex-shrink-0 w-14",
                isCompact ? "text-[10px]" : "text-xs"
              )}>
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
                  <Avatar className={isCompact ? "h-4 w-4" : "h-5 w-5"}>
                    <AvatarImage src={task.assignee.avatarUrl || undefined} />
                    <AvatarFallback className={isCompact ? "text-[8px]" : "text-[10px]"}>
                      {task.assignee.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={cn(
                    "rounded-full border border-dashed border-border opacity-30",
                    isCompact ? "h-4 w-4" : "h-5 w-5"
                  )} />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
