"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreHorizontal, Trash2, Calendar, User, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Step {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
  isCompleted: boolean | null;
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

interface StepListProps {
  taskId: string;
  steps: Step[];
  members: Member[];
  onStepsChange: () => void;
}

export function StepList({ taskId, steps, members, onStepsChange }: StepListProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const completedCount = steps.filter((s) => s.isCompleted).length;

  const handleAddStep = async () => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) throw new Error("Failed to create step");

      setNewTitle("");
      setIsAdding(false);
      onStepsChange();
      router.refresh();
      toast.success("Step added");
    } catch {
      toast.error("Failed to add step");
    }
  };

  const handleToggleComplete = async (step: Step) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !step.isCompleted }),
      });

      if (!response.ok) throw new Error("Failed to update step");

      onStepsChange();
      router.refresh();
    } catch {
      toast.error("Failed to update step");
    }
  };

  const handleDelete = async (stepId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete step");

      onStepsChange();
      router.refresh();
      toast.success("Step deleted");
    } catch {
      toast.error("Failed to delete step");
    }
  };

  const handleUpdateTitle = async (stepId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      if (!response.ok) throw new Error("Failed to update step");

      setEditingId(null);
      onStepsChange();
      router.refresh();
    } catch {
      toast.error("Failed to update step");
    }
  };

  const handleAssigneeChange = async (stepId: string, assigneeId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update assignee");

      onStepsChange();
      router.refresh();
    } catch {
      toast.error("Failed to update assignee");
    }
  };

  const handleDueDateChange = async (stepId: string, dueDate: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update due date");

      onStepsChange();
      router.refresh();
    } catch {
      toast.error("Failed to update due date");
    }
  };

  const formatDueDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Steps
        {steps.length > 0 && (
          <span className="text-xs">
            ({completedCount}/{steps.length})
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-2">
          {/* Step list */}
          {steps.map((step) => (
            <div
              key={step.id}
              className="group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={step.isCompleted || false}
                onCheckedChange={() => handleToggleComplete(step)}
              />

              {editingId === step.id ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleUpdateTitle(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateTitle(step.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => {
                    setEditingId(step.id);
                    setEditTitle(step.title);
                  }}
                  className={cn(
                    "flex-1 text-sm cursor-text truncate",
                    step.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              )}

              {/* Due date */}
              {step.dueDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(step.dueDate)}
                </span>
              )}

              {/* Assignee */}
              {step.assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={step.assignee.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {step.assignee.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                    <Select
                      value={step.assigneeId || "unassigned"}
                      onValueChange={(v) => handleAssigneeChange(step.id, v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <span className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {member.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {member.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-1">Due date</p>
                    <Input
                      type="date"
                      value={
                        step.dueDate
                          ? new Date(step.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleDueDateChange(step.id, e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <DropdownMenuItem
                    onClick={() => handleDelete(step.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {/* Add step form */}
          {isAdding ? (
            <div className="flex items-center gap-2 py-1 pl-2">
              <div className="w-4" /> {/* Spacer for checkbox alignment */}
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddStep();
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewTitle("");
                  }
                }}
                placeholder="Step title..."
                className="flex-1 h-7 text-sm"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleAddStep} className="h-7 px-2">
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle("");
                }}
                className="h-7 px-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1 pl-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add step
            </button>
          )}
        </div>
      )}
    </div>
  );
}
