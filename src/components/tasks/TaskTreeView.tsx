"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Layer {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface Task {
  id: string;
  title: string;
  statusId: string | null;
  layerId: string | null;
  parentTaskId: string | null;
  priority: "None" | "Low" | "Medium" | "High" | "Urgent";
  layer?: Layer | null;
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

function buildTree(tasks: Task[]): TreeNode[] {
  const taskMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes for all tasks
  tasks.forEach((task) => {
    taskMap.set(task.id, { task, children: [], depth: 0 });
  });

  // Build tree structure
  tasks.forEach((task) => {
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

  return roots;
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
          <span className="truncate">{task.title}</span>

          {/* Children count */}
          {children.length > 0 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              ({children.length})
            </span>
          )}
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
  const tree = useMemo(() => buildTree(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks yet. Create some tasks to see the hierarchy.
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No root tasks found.
      </div>
    );
  }

  return (
    <div>
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
    </div>
  );
}
