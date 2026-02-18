"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Status {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isDefault: boolean | null;
  isCompleted: boolean | null;
}

interface WorkflowSettingsProps {
  projectId: string;
  statuses: Status[];
}

const defaultColors = [
  "#9ca3af", // gray
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#a855f7", // purple
  "#ec4899", // pink
];

export function WorkflowSettings({ projectId, statuses: initialStatuses }: WorkflowSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>(initialStatuses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editIsCompleted, setEditIsCompleted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#9ca3af");

  const startEdit = (status: Status) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color || "#9ca3af");
    setEditIsDefault(status.isDefault || false);
    setEditIsCompleted(status.isCompleted || false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditIsDefault(false);
    setEditIsCompleted(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/statuses/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            color: editColor,
            isDefault: editIsDefault,
            isCompleted: editIsCompleted,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");

      setStatuses((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: editName.trim(),
                color: editColor,
                isDefault: editIsDefault,
                isCompleted: editIsCompleted,
              }
            : editIsDefault
            ? { ...s, isDefault: false }
            : s
        )
      );
      cancelEdit();
      router.refresh();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const addStatus = async () => {
    if (!newName.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
        }),
      });

      if (!response.ok) throw new Error("Failed to create status");

      const status = await response.json();
      setStatuses((prev) => [...prev, status]);
      setNewName("");
      setNewColor("#9ca3af");
      setIsAdding(false);
      router.refresh();
      toast.success("Status created");
    } catch {
      toast.error("Failed to create status");
    }
  };

  const deleteStatus = async (id: string) => {
    if (!confirm("Delete this status? Tasks will be moved to the default status.")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/statuses/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete status");

      setStatuses((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
      toast.success("Status deleted");
    } catch {
      toast.error("Failed to delete status");
    }
  };

  const moveStatus = async (id: string, direction: "up" | "down") => {
    const index = statuses.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === statuses.length - 1)
    ) {
      return;
    }

    const newStatuses = [...statuses];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newStatuses[index], newStatuses[swapIndex]] = [
      newStatuses[swapIndex],
      newStatuses[index],
    ];

    setStatuses(newStatuses);

    try {
      const response = await fetch(`/api/projects/${projectId}/statuses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: newStatuses.map((s) => s.id),
        }),
      });

      if (!response.ok) throw new Error("Failed to reorder");
      router.refresh();
    } catch {
      setStatuses(statuses); // Revert
      toast.error("Failed to reorder statuses");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Customize the statuses for tasks in this project.
          </p>

          {/* Status list */}
          <div className="space-y-2">
            {statuses.map((status, index) => (
              <div
                key={status.id}
                className="flex items-center gap-2 p-2 border rounded-md"
              >
                {editingId === status.id ? (
                  // Edit mode
                  <div className="flex-1 space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Status name"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2",
                            editColor === color
                              ? "border-foreground"
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={editIsDefault}
                          onCheckedChange={(v) => setEditIsDefault(!!v)}
                        />
                        Default
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={editIsCompleted}
                          onCheckedChange={(v) => setEditIsCompleted(!!v)}
                        />
                        Marks complete
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        className="cursor-grab text-muted-foreground hover:text-foreground"
                        onClick={() => moveStatus(status.id, "up")}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color || "#9ca3af" }}
                      />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{status.name}</span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {status.isDefault && <span>Default</span>}
                        {status.isCompleted && <span>Completes task</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(status)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteStatus(status.id)}
                      disabled={statuses.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new status */}
          {isAdding ? (
            <div className="p-3 border rounded-md space-y-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New status name"
                autoFocus
              />
              <div className="flex gap-1">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2",
                      newColor === color
                        ? "border-foreground"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addStatus} disabled={!newName.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
