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
import { Calendar, User, Flag, Loader2, Trash2, MoreHorizontal, Layers, GitBranch, Plus, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CommentList } from "@/components/comments/CommentList";
import { StepList } from "@/components/steps/StepList";

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
  const [steps, setSteps] = useState<Array<{
    id: string;
    title: string;
    description: string | null;
    statusId: string;
    assigneeId: string | null;
    dueDate: Date | null;
    isCompleted: boolean | null;
    assignee?: { id: string; name: string; avatarUrl: string | null } | null;
    status?: { id: string; name: string; color: string | null } | null;
  }>>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [workLogs, setWorkLogs] = useState<Array<{
    id: string;
    startTime: string;
    endTime: string | null;
    note: string | null;
    user: { id: string; name: string; avatarUrl: string | null };
  }>>([]);
  const [isLoadingWorkLogs, setIsLoadingWorkLogs] = useState(false);
  const [workLogsExpanded, setWorkLogsExpanded] = useState(false);
  const [workLogsLoaded, setWorkLogsLoaded] = useState(false);

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
      loadSteps(task.id);
      setWorkLogs([]);
      setWorkLogsExpanded(false);
      setWorkLogsLoaded(false);
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

  const loadWorkLogs = async (taskId: string) => {
    setIsLoadingWorkLogs(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/work-logs`);
      if (response.ok) {
        setWorkLogs(await response.json());
      } else {
        console.error("Failed to load work logs, status:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Failed to load work logs", error);
    } finally {
      setIsLoadingWorkLogs(false);
      setWorkLogsLoaded(true);
    }
  };

  const handleToggleWorkLogs = () => {
    if (!workLogsExpanded && !workLogsLoaded && task) {
      loadWorkLogs(task.id);
    }
    setWorkLogsExpanded((v) => !v);
  };

  const loadSteps = async (taskId: string) => {
    setIsLoadingSteps(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/steps`);
      if (response.ok) {
        const data = await response.json();
        setSteps(data);
      }
    } catch (error) {
      console.error("Failed to load steps", error);
    } finally {
      setIsLoadingSteps(false);
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
    const parentTask = parent ? tasks.find((t) => t.id === parent) : null;
    const sortedLayers = [...layers].sort((a, b) => a.position - b.position);
    const parentLayerPosition = parentTask?.layer?.position ?? -1;
    const currentLayerPosition = layers.find((l) => l.id === layerId)?.position ?? -1;

    // Check if we need to adjust the layer (current layer is same or higher than parent)
    let newLayerId = layerId;
    let layerShift = 0;
    let layersCreated = 0;
    const projectId = window.location.pathname.match(/project\/([^/]+)/)?.[1];

    if (parentTask && parentLayerPosition >= 0 && currentLayerPosition <= parentLayerPosition) {
      // Calculate how many positions to shift down
      layerShift = parentLayerPosition - currentLayerPosition + 1;

      // Find the new layer for this task
      const newLayerIndex = sortedLayers.findIndex((l) => l.id === layerId) + layerShift;
      if (newLayerIndex < sortedLayers.length) {
        newLayerId = sortedLayers[newLayerIndex].id;
      } else {
        // Need to create new layers
        const layersNeeded = newLayerIndex - sortedLayers.length + 1;
        let currentLayers = [...sortedLayers];

        for (let i = 0; i < layersNeeded; i++) {
          try {
            if (projectId) {
              const newLayerNum = currentLayers.length + 1;
              const layerResponse = await fetch(`/api/projects/${projectId}/layers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: `Layer ${newLayerNum}` }),
              });

              if (layerResponse.ok) {
                const createdLayer = await layerResponse.json();
                currentLayers.push(createdLayer);
                layersCreated++;
              }
            }
          } catch {
            // Continue
          }
        }

        if (currentLayers.length > sortedLayers.length) {
          newLayerId = currentLayers[newLayerIndex]?.id || layerId;
        }
      }
    }

    try {
      // Update the task itself
      const updateData: { parentTaskId: string | null; layerId?: string | null } = { parentTaskId: parent };
      if (newLayerId !== layerId) {
        updateData.layerId = newLayerId;
      }

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update parent task");

      // If layer shifted, also shift all descendants
      if (layerShift > 0 && projectId) {
        // Find all descendants recursively
        const findDescendants = (taskId: string): string[] => {
          const children = tasks.filter((t) => t.parentTaskId === taskId);
          return children.flatMap((c) => [c.id, ...findDescendants(c.id)]);
        };
        const descendantIds = findDescendants(task.id);

        // Refresh layers list to include newly created ones
        const layersResponse = await fetch(`/api/projects/${projectId}/layers`);
        const updatedLayers = layersResponse.ok ? await layersResponse.json() : sortedLayers;
        const updatedSortedLayers = [...updatedLayers].sort((a: { position: number }, b: { position: number }) => a.position - b.position);

        // Update each descendant's layer
        for (const descId of descendantIds) {
          const descTask = tasks.find((t) => t.id === descId);
          if (!descTask?.layerId) continue;

          const descLayerIndex = sortedLayers.findIndex((l) => l.id === descTask.layerId);
          const newDescLayerIndex = descLayerIndex + layerShift;

          // Create more layers if needed
          while (newDescLayerIndex >= updatedSortedLayers.length) {
            try {
              const newLayerNum = updatedSortedLayers.length + 1;
              const layerResponse = await fetch(`/api/projects/${projectId}/layers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: `Layer ${newLayerNum}` }),
              });

              if (layerResponse.ok) {
                const createdLayer = await layerResponse.json();
                updatedSortedLayers.push(createdLayer);
                layersCreated++;
              } else {
                break;
              }
            } catch {
              break;
            }
          }

          const newDescLayerId = updatedSortedLayers[newDescLayerIndex]?.id;
          if (newDescLayerId && newDescLayerId !== descTask.layerId) {
            await fetch(`/api/tasks/${descId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ layerId: newDescLayerId }),
            });
          }
        }
      }

      setParentTaskId(parent);
      if (newLayerId !== layerId) {
        setLayerId(newLayerId);
      }
      router.refresh();

      if (layersCreated > 0) {
        toast.success(`Parent updated. ${layersCreated} new layer${layersCreated > 1 ? "s" : ""} created to maintain hierarchy.`);
      } else if (newLayerId !== layerId) {
        toast.success("Parent updated. Layers adjusted to maintain hierarchy.");
      } else {
        toast.success("Parent task updated");
      }
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
    let nextLayer = currentLayerIndex >= 0 && currentLayerIndex < sortedLayers.length - 1
      ? sortedLayers[currentLayerIndex + 1]
      : null;

    try {
      // Get project ID from the current task's URL or context
      const projectId = window.location.pathname.match(/project\/([^/]+)/)?.[1];
      if (!projectId) throw new Error("Project ID not found");

      // If no next layer exists, create a new one
      let newLayerCreated = false;
      if (!nextLayer) {
        const newLayerNum = layers.length + 1;
        const newLayerName = `Layer ${newLayerNum}`;

        const layerResponse = await fetch(`/api/projects/${projectId}/layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newLayerName }),
        });

        if (!layerResponse.ok) throw new Error("Failed to create layer");

        nextLayer = await layerResponse.json();
        newLayerCreated = true;
      }

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

      if (newLayerCreated && nextLayer) {
        toast.success(`${nextLayer.name} is created below the lowest layer. You can edit from 'Layers'.`);
      } else {
        toast.success("Derived task created");
      }
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

  // Filter layers based on parent task's layer - can only assign lower layer (stricter WBS)
  const parentLayer = currentParentTask?.layer;
  const availableLayers = parentLayer
    ? layers.filter((l) => l.position > parentLayer.position)
    : layers;

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
                    {availableLayers.map((layer) => (
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
              <div className="space-y-1 mt-4 pl-6 pr-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateDerivedTask}
                  className="w-full"
                  disabled={!layerId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create derived task
                </Button>
                {!layerId && (
                  <p className="text-xs text-muted-foreground text-center">
                    Assign a layer to enable
                  </p>
                )}
              </div>
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

          {/* Steps */}
          <div className="border-t pt-4">
            {isLoadingSteps ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <StepList
                taskId={task.id}
                currentStatusId={statusId}
                steps={steps}
                statuses={statuses}
                members={members}
                onStepsChange={() => loadSteps(task.id)}
              />
            )}
          </div>

          {/* Work Logs */}
          <div className="border-t pt-4">
            <button
              onClick={handleToggleWorkLogs}
              className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${workLogsExpanded ? "rotate-90" : ""}`} />
              Work Logs
              {workLogs.length > 0 && (
                <span className="text-xs text-muted-foreground/60">({workLogs.length})</span>
              )}
            </button>

            {workLogsExpanded && (
              <div className="mt-3 space-y-1">
                {isLoadingWorkLogs ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : workLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1">No work logs for this task.</p>
                ) : (
                  workLogs.map((log) => {
                    const duration = log.endTime
                      ? (() => {
                          const ms = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
                          const h = Math.floor(ms / 3_600_000);
                          const m = Math.floor((ms % 3_600_000) / 60_000);
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()
                      : null;

                    return (
                      <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 text-sm">
                        <Avatar className="h-5 w-5 flex-shrink-0 mt-0.5">
                          <AvatarImage src={log.user.avatarUrl || undefined} />
                          <AvatarFallback className="text-[9px]">
                            {log.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs">{log.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.startTime), "MMM d")}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {format(new Date(log.startTime), "HH:mm")}
                              {log.endTime && ` – ${format(new Date(log.endTime), "HH:mm")}`}
                            </span>
                            {duration && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {duration}
                              </span>
                            )}
                          </div>
                          {log.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
