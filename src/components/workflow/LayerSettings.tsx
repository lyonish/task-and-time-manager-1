"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Layers,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Layer {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
}

interface LayerSettingsProps {
  projectId: string;
  layers: Layer[];
}

const defaultColors = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
];

const PRESETS = {
  default: {
    label: "Default (Layer 1-4)",
    layers: [
      { name: "Layer 1", color: "#8b5cf6" },
      { name: "Layer 2", color: "#3b82f6" },
      { name: "Layer 3", color: "#22c55e" },
      { name: "Layer 4", color: "#9ca3af" },
    ],
  },
  size: {
    label: "Size (Large → Tiny)",
    layers: [
      { name: "Large", color: "#8b5cf6" },
      { name: "Medium", color: "#3b82f6" },
      { name: "Small", color: "#22c55e" },
      { name: "Tiny", color: "#9ca3af" },
    ],
  },
  birds: {
    label: "Birds (Condor → Sparrow)",
    layers: [
      { name: "Condor", color: "#8b5cf6" },
      { name: "Eagle", color: "#3b82f6" },
      { name: "Pigeon", color: "#22c55e" },
      { name: "Sparrow", color: "#9ca3af" },
    ],
  },
  agile: {
    label: "Agile (Epic → Subtask)",
    layers: [
      { name: "Epic", color: "#8b5cf6" },
      { name: "Story", color: "#3b82f6" },
      { name: "Task", color: "#22c55e" },
      { name: "Subtask", color: "#9ca3af" },
    ],
  },
  software: {
    label: "Software (Epic → Feature)",
    layers: [
      { name: "Epic", color: "#8b5cf6" },
      { name: "Feature", color: "#3b82f6" },
      { name: "Task", color: "#22c55e" },
      { name: "Subtask", color: "#9ca3af" },
    ],
  },
  traditional: {
    label: "Traditional PM",
    layers: [
      { name: "Phase", color: "#8b5cf6" },
      { name: "Deliverable", color: "#3b82f6" },
      { name: "Work Package", color: "#22c55e" },
      { name: "Activity", color: "#9ca3af" },
    ],
  },
} as const;

type PresetKey = keyof typeof PRESETS;

function SortableLayerItem({
  layer,
  index,
  isEditing,
  editName,
  editColor,
  onEditNameChange,
  onEditColorChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}: {
  layer: Layer;
  index: number;
  isEditing: boolean;
  editName: string;
  editColor: string;
  onEditNameChange: (v: string) => void;
  onEditColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded-md bg-background"
    >
      {isEditing ? (
        <div className="flex-1 space-y-3">
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Layer name"
            autoFocus
          />
          <div className="flex gap-1">
            {defaultColors.map((color) => (
              <button
                key={color}
                onClick={() => onEditColorChange(color)}
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
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: layer.color || "#6366f1" }}
            />
          </div>
          <div className="flex-1">
            <span className="font-medium">{layer.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              Level {index + 1}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function LayerSettings({ projectId, layers: initialLayers }: LayerSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  // Sync local state with prop when it changes (e.g., layer created externally)
  useEffect(() => {
    setLayers(initialLayers);
  }, [initialLayers]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const startEdit = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
    setEditColor(layer.color || "#6366f1");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/layers/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            color: editColor,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update layer");

      setLayers((prev) =>
        prev.map((l) =>
          l.id === editingId
            ? { ...l, name: editName.trim(), color: editColor }
            : l
        )
      );
      cancelEdit();
      router.refresh();
      toast.success("Layer updated");
    } catch {
      toast.error("Failed to update layer");
    }
  };

  const addLayer = async () => {
    if (!newName.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/layers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
        }),
      });

      if (!response.ok) throw new Error("Failed to create layer");

      const layer = await response.json();
      setLayers((prev) => [...prev, layer]);
      setNewName("");
      setNewColor("#6366f1");
      setIsAdding(false);
      router.refresh();
      toast.success("Layer created");
    } catch {
      toast.error("Failed to create layer");
    }
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer? Tasks will have their layer unset.")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/layers/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete layer");

      setLayers((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
      toast.success("Layer deleted");
    } catch {
      toast.error("Failed to delete layer");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex((l) => l.id === active.id);
      const newIndex = layers.findIndex((l) => l.id === over.id);
      const newLayers = arrayMove(layers, oldIndex, newIndex);

      setLayers(newLayers);

      try {
        const response = await fetch(`/api/projects/${projectId}/layers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderedIds: newLayers.map((l) => l.id),
          }),
        });

        if (!response.ok) throw new Error("Failed to reorder");
        router.refresh();
      } catch {
        setLayers(layers);
        toast.error("Failed to reorder layers");
      }
    }
  };

  const applyPreset = async (presetKey: PresetKey) => {
    const preset = PRESETS[presetKey];

    try {
      // Delete existing layers first
      for (const layer of layers) {
        await fetch(`/api/projects/${projectId}/layers/${layer.id}`, {
          method: "DELETE",
        });
      }
      setLayers([]);

      // Create new layers from preset
      const newLayers: Layer[] = [];
      for (const def of preset.layers) {
        const response = await fetch(`/api/projects/${projectId}/layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(def),
        });
        if (response.ok) {
          const layer = await response.json();
          newLayers.push(layer);
        }
      }
      setLayers(newLayers);
      router.refresh();
      toast.success(`Applied "${preset.label}" preset`);
    } catch {
      toast.error("Failed to apply preset");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4 mr-2" />
          Layers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Task Layers (WBS)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Define layers for your work breakdown structure. Higher layers represent larger scope items.
          </p>

          {layers.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No layers defined yet. Choose a preset:</p>
              <div className="flex flex-col gap-2">
                {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => applyPreset(key)}
                    className="justify-start"
                  >
                    {PRESETS[key].label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Preset selector when layers exist */}
          {layers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Apply preset:</span>
              <Select onValueChange={(v) => applyPreset(v as PresetKey)}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRESETS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Layer list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {layers.map((layer, index) => (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    index={index}
                    isEditing={editingId === layer.id}
                    editName={editName}
                    editColor={editColor}
                    onEditNameChange={setEditName}
                    onEditColorChange={setEditColor}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onStartEdit={() => startEdit(layer)}
                    onDelete={() => deleteLayer(layer.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add new layer */}
          {isAdding ? (
            <div className="p-3 border rounded-md space-y-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New layer name"
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
                <Button size="sm" onClick={addLayer} disabled={!newName.trim()}>
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
            layers.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Layer
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
