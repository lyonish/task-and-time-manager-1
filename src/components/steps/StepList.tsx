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
import { Plus, MoreHorizontal, Trash2, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Status {
  id: string;
  name: string;
  color: string | null;
}

interface Step {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  assigneeId: string | null;
  dueDate: Date | null;
  isCompleted: boolean | null;
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  status?: Status | null;
}

interface StepListProps {
  taskId: string;
  currentStatusId: string | null;
  steps: Step[];
  statuses: Status[];
  members: Member[];
  onStepsChange: () => void;
}

export function StepList({
  taskId,
  currentStatusId,
  steps,
  statuses,
  members,
  onStepsChange,
}: StepListProps) {
  const router = useRouter();
  const [addingToStatusId, setAddingToStatusId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(
    new Set(currentStatusId ? [currentStatusId] : [])
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Group steps by status
  const stepsByStatus = statuses.map((status) => ({
    status,
    steps: steps.filter((s) => s.statusId === status.id),
    isCurrent: status.id === currentStatusId,
  }));

  const currentStatusSteps = steps.filter((s) => s.statusId === currentStatusId);
  const completedCount = currentStatusSteps.filter((s) => s.isCompleted).length;
  const totalCount = currentStatusSteps.length;

  const toggleStatus = (statusId: string) => {
    setExpandedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(statusId)) {
        next.delete(statusId);
      } else {
        next.add(statusId);
      }
      return next;
    });
  };

  const handleAddStep = async (statusId: string) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), statusId }),
      });

      if (!response.ok) throw new Error("Failed to create step");

      setNewTitle("");
      setAddingToStatusId(null);
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

      // Check if this completion caused auto-advance
      if (!step.isCompleted && step.statusId === currentStatusId) {
        const statusSteps = steps.filter((s) => s.statusId === currentStatusId);
        const willBeAllCompleted =
          statusSteps.filter((s) => s.id !== step.id).every((s) => s.isCompleted);
        if (willBeAllCompleted) {
          toast.success("All steps completed! Moving to next status...");
        }
      }
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
    <div className="space-y-3">
      {/* Header with current status progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Steps</span>
        {currentStatusId && totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} in current status
          </span>
        )}
      </div>

      {/* Steps grouped by status */}
      <div className="space-y-2">
        {stepsByStatus.map(({ status, steps: statusSteps, isCurrent }) => {
          const isExpanded = expandedStatuses.has(status.id);
          const statusCompletedCount = statusSteps.filter((s) => s.isCompleted).length;

          return (
            <div key={status.id} className={cn("rounded-md", isCurrent && "bg-accent/30")}>
              {/* Status header */}
              <button
                onClick={() => toggleStatus(status.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent/50 rounded-md transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: status.color || "#9ca3af" }}
                />
                <span className={cn("flex-1 text-left", isCurrent && "font-medium")}>
                  {status.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {statusCompletedCount}/{statusSteps.length}
                </span>
              </button>

              {/* Steps for this status */}
              {isExpanded && (
                <div className="pl-4 space-y-0.5">
                  {statusSteps.map((step) => (
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

                  {/* Add step button for this status */}
                  {addingToStatusId === status.id ? (
                    <div className="flex items-center gap-2 py-1 px-2">
                      <div className="w-4" />
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddStep(status.id);
                          if (e.key === "Escape") {
                            setAddingToStatusId(null);
                            setNewTitle("");
                          }
                        }}
                        placeholder="Step title..."
                        className="flex-1 h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddStep(status.id)}
                        className="h-7 px-2"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingToStatusId(null);
                          setNewTitle("");
                        }}
                        className="h-7 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setExpandedStatuses((prev) => new Set(prev).add(status.id));
                        setAddingToStatusId(status.id);
                      }}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground py-1 px-2 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add step
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
