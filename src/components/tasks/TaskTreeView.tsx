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
  Low: "#3b82f6",
  None: "#9ca3af",
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
  parentLines,
}: {
  node: TreeNode;
  onTaskClick?: (task: Task) => void;
  isLast: boolean;
  parentLines: boolean[];
}) {
  const { task, children } = node;
  const isRoot = node.depth === 0;

  return (
    <div className="relative">
      <div className="flex">
        {/* Vertical continuation lines from ancestors */}
        {parentLines.map((showLine, i) => (
          <div key={i} className="w-7 flex-shrink-0 relative">
            {showLine && (
              <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
            )}
          </div>
        ))}

        {/* L-shaped connector for non-root nodes */}
        {!isRoot && (
          <div className="w-7 flex-shrink-0 relative">
            {/* Vertical line from top to middle - aligned with parent dot center (px-3 + w-3/2 = ~18px) */}
            <div className="absolute left-[18px] top-0 h-5 w-px bg-border" />
            {/* Horizontal line turning right */}
            <div className="absolute left-[18px] top-5 w-[10px] h-px bg-border" />
            {/* Continue vertical line if not last sibling */}
            {!isLast && (
              <div className="absolute left-[18px] top-5 bottom-0 w-px bg-border" />
            )}
          </div>
        )}

        {/* Task node */}
        <button
          onClick={() => onTaskClick?.(task)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left flex-1 min-w-0",
            isRoot && "font-medium"
          )}
        >
          {/* Priority dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: priorityColors[task.priority] }}
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
          {children.map((child, index) => (
            <TreeNodeComponent
              key={child.task.id}
              node={child}
              onTaskClick={onTaskClick}
              isLast={index === children.length - 1}
              parentLines={isRoot ? [] : [...parentLines, !isLast]}
            />
          ))}
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
    <div className="space-y-1">
      {tree.map((node, index) => (
        <TreeNodeComponent
          key={node.task.id}
          node={node}
          onTaskClick={onTaskClick}
          isLast={index === tree.length - 1}
          parentLines={[]}
        />
      ))}
    </div>
  );
}
