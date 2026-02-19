"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, User, Flag, Loader2, Trash2, MoreHorizontal, Layers, GitBranch, Plus } from "lucide-react";
import { toast } from "sonner";
import { CommentList } from "@/components/comments/CommentList";

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

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date | null;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
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
}

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: Status[];
  layers: Layer[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

const priorities = ["None", "Low", "Medium", "High", "Urgent"] as const;

const priorityColors: Record<string, string> = {
  Urgent: "text-red-500",
  High: "text-orange-500",
  Medium: "text-yellow-500",
  Low: "text-gray-400",
  None: "text-gray-500",
};

export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  statuses,
  layers,
  tasks,
  members,
  currentUserId,
}: TaskDetailPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [priority, setPriority] = useState<typeof priorities[number]>("None");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatusId(task.statusId);
      setLayerId(task.layerId);
      setParentTaskId(task.parentTaskId);
      setAssigneeId(task.assigneeId);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
      loadComments(task.id);
    }
  }, [task]);

  const loadComments = async (taskId: string) => {
    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to load comments", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      router.refresh();
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority: typeof priority) => {
    if (!task) return;
    setPriority(newPriority);

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!response.ok) throw new Error("Failed to update priority");

      router.refresh();
      toast.success("Priority updated");
    } catch {
      toast.error("Failed to update priority");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: newStatusId }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setStatusId(newStatusId);
      router.refresh();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!task) return;

    const assignee = newAssigneeId === "unassigned" ? null : newAssigneeId;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assignee }),
      });

      if (!response.ok) throw new Error("Failed to update assignee");

      setAssigneeId(assignee);
      router.refresh();
      toast.success("Assignee updated");
    } catch {
      toast.error("Failed to update assignee");
    }
  };

  const handleLayerChange = async (newLayerId: string) => {
    if (!task) return;

    const layer = newLayerId === "none" ? null : newLayerId;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layerId: layer }),
      });

      if (!response.ok) throw new Error("Failed to update layer");

      setLayerId(layer);
      router.refresh();
      toast.success("Layer updated");
    } catch {
      toast.error("Failed to update layer");
    }
  };

  const handleParentTaskChange = async (newParentId: string) => {
    if (!task) return;

    const parent = newParentId === "none" ? null : newParentId;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentTaskId: parent }),
      });

      if (!response.ok) throw new Error("Failed to update parent task");

      setParentTaskId(parent);
      router.refresh();
      toast.success("Parent task updated");
    } catch {
      toast.error("Failed to update parent task");
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      onOpenChange(false);
      router.refresh();
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleCreateDerivedTask = async () => {
    if (!task) return;

    // Find the next layer (one level below current)
    const sortedLayers = [...layers].sort((a, b) => a.position - b.position);
    const currentLayerIndex = sortedLayers.findIndex((l) => l.id === task.layerId);
    const nextLayer = currentLayerIndex >= 0 && currentLayerIndex < sortedLayers.length - 1
      ? sortedLayers[currentLayerIndex + 1]
      : null;

    try {
      // Get project ID from the current task's URL or context
      const projectId = window.location.pathname.match(/project\/([^/]+)/)?.[1];
      if (!projectId) throw new Error("Project ID not found");

      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New subtask",
          parentTaskId: task.id,
          layerId: nextLayer?.id || task.layerId,
          statusId: task.statusId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      router.refresh();
      toast.success("Derived task created");
    } catch {
      toast.error("Failed to create derived task");
    }
  };

  if (!task) return null;

  const currentStatus = statuses.find((s) => s.id === statusId);
  const currentLayer = layers.find((l) => l.id === layerId);
  const currentParentTask = tasks.find((t) => t.id === parentTaskId);
  const currentAssignee = members.find((m) => m.id === assigneeId);
  // Filter out current task and its descendants for parent selection
  const availableParentTasks = tasks.filter((t) => t.id !== task.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="sr-only">Task Details</SheetTitle>
            <Select value={statusId || ""} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-auto">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color || "#9ca3af" }}
                      />
                      {status.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
              placeholder="Task title"
            />
          </div>

          {/* Meta fields */}
          <div className="grid gap-4">
            {/* Assignee */}
            <div className="flex items-center gap-4">
              <Label className="w-24 text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignee
              </Label>
              <Select
                value={assigneeId || "unassigned"}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Unassigned">
                    {currentAssignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={currentAssignee.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {currentAssignee.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {currentAssignee.name}
                      </span>
                    ) : (
                      "Unassigned"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
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

            {/* Due Date */}
            <div className="flex items-center gap-4">
              <Label className="w-24 text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleSave}
                className="flex-1"
              />
            </div>

            {/* Priority */}
            <div className="flex items-center gap-4">
              <Label className="w-24 text-muted-foreground flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(value) => handlePriorityChange(value as typeof priority)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    <span className={priorityColors[priority]}>{priority}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={priorityColors[p]}>{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layer */}
            {layers.length > 0 && (
              <div className="flex items-center gap-4">
                <Label className="w-24 text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Layer
                </Label>
                <Select
                  value={layerId || "none"}
                  onValueChange={handleLayerChange}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="None">
                      {currentLayer ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentLayer.color || "#6366f1" }}
                          />
                          {currentLayer.name}
                        </span>
                      ) : (
                        "None"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {layers.map((layer) => (
                      <SelectItem key={layer.id} value={layer.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: layer.color || "#6366f1" }}
                          />
                          {layer.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parent Task */}
            {availableParentTasks.length > 0 && (
              <div className="flex items-center gap-4">
                <Label className="w-24 text-muted-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Parent
                </Label>
                <Select
                  value={parentTaskId || "none"}
                  onValueChange={handleParentTaskChange}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="None">
                      {currentParentTask ? currentParentTask.title : "None"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableParentTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Create Derived Task */}
            {layers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateDerivedTask}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create derived task
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add a description..."
              rows={4}
            />
          </div>

          {/* Comments */}
          <div className="border-t pt-6">
            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommentList
                taskId={task.id}
                comments={comments}
                members={members}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
