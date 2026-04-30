"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectInfo {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  iconUrl: string | null;
}

interface Status {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isDefault: boolean | null;
  isCompleted: boolean | null;
}

interface Layer {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
}

interface AccessEntry {
  id: string;
  principalType: "user" | "group";
  principalId: string;
  role: "Owner" | "Editor" | "Viewer";
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  isDefault?: boolean | null;
}

interface GroupOption { id: string; name: string; isDefault: boolean | null }
interface MemberOption { user: { id: string; name: string; email: string; avatarUrl: string | null } }

interface ProjectSettingsProps {
  project: ProjectInfo;
  statuses: Status[];
  layers: Layer[];
  workspaceId: string;
  currentUserId: string;
  onProjectUpdate?: (updated: Partial<ProjectInfo>) => void;
}

type Tab = "general" | "workflow" | "layers" | "access";

// ─── Color palettes ────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  "#6366f1", "#3b82f6", "#22c55e", "#eab308",
  "#f97316", "#ef4444", "#a855f7", "#ec4899",
  "#14b8a6", "#64748b",
];

const STATUS_COLORS = [
  "#9ca3af", "#3b82f6", "#22c55e", "#eab308",
  "#f97316", "#ef4444", "#a855f7", "#ec4899",
];

const LAYER_COLORS = [
  "#8b5cf6", "#3b82f6", "#22c55e", "#eab308",
  "#f97316", "#ef4444", "#ec4899", "#6366f1",
];

// ─── Layer presets ─────────────────────────────────────────────────────────────

const PRESETS = {
  default:     { label: "Default (Layer 1-4)",      layers: [{ name: "Layer 1", color: "#8b5cf6" }, { name: "Layer 2", color: "#3b82f6" }, { name: "Layer 3", color: "#22c55e" }, { name: "Layer 4", color: "#9ca3af" }] },
  size:        { label: "Size (Large → Tiny)",       layers: [{ name: "Large",   color: "#8b5cf6" }, { name: "Medium", color: "#3b82f6" }, { name: "Small",  color: "#22c55e" }, { name: "Tiny",   color: "#9ca3af" }] },
  birds:       { label: "Birds (Condor → Sparrow)",  layers: [{ name: "Condor",  color: "#8b5cf6" }, { name: "Eagle",  color: "#3b82f6" }, { name: "Pigeon", color: "#22c55e" }, { name: "Sparrow",color: "#9ca3af" }] },
  agile:       { label: "Agile (Epic → Subtask)",    layers: [{ name: "Epic",    color: "#8b5cf6" }, { name: "Story",  color: "#3b82f6" }, { name: "Task",   color: "#22c55e" }, { name: "Subtask",color: "#9ca3af" }] },
  software:    { label: "Software (Epic → Feature)", layers: [{ name: "Epic",    color: "#8b5cf6" }, { name: "Feature",color: "#3b82f6" }, { name: "Task",   color: "#22c55e" }, { name: "Subtask",color: "#9ca3af" }] },
  traditional: { label: "Traditional PM",            layers: [{ name: "Phase",   color: "#8b5cf6" }, { name: "Deliverable", color: "#3b82f6" }, { name: "Work Package", color: "#22c55e" }, { name: "Activity", color: "#9ca3af" }] },
} as const;
type PresetKey = keyof typeof PRESETS;

// ─── Sortable layer row ────────────────────────────────────────────────────────

function SortableLayerRow({
  layer, index, isEditing, editName, editColor,
  onEditNameChange, onEditColorChange, onSave, onCancel, onStartEdit, onDelete,
}: {
  layer: Layer; index: number; isEditing: boolean;
  editName: string; editColor: string;
  onEditNameChange: (v: string) => void; onEditColorChange: (v: string) => void;
  onSave: () => void; onCancel: () => void; onStartEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 p-2 border rounded-md bg-background"
    >
      {isEditing ? (
        <div className="flex-1 space-y-2">
          <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} placeholder="Layer name" autoFocus />
          <div className="flex gap-1">
            {LAYER_COLORS.map((c) => (
              <button key={c} onClick={() => onEditColorChange(c)}
                className={cn("w-5 h-5 rounded-full border-2", editColor === c ? "border-foreground" : "border-transparent")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color || "#6366f1" }} />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{layer.name}</span>
            <span className="text-xs text-muted-foreground ml-2">Level {index + 1}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ProjectSettings({ project, statuses: initialStatuses, layers: initialLayers, workspaceId, currentUserId, onProjectUpdate }: ProjectSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("general");

  // General tab state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color ?? "#6366f1");
  const [iconUrl, setIconUrl] = useState(project.iconUrl ?? "");
  const [saving, setSaving] = useState(false);

  // Workflow tab state
  const [statuses, setStatuses] = useState<Status[]>(initialStatuses);
  const [statusEditingId, setStatusEditingId] = useState<string | null>(null);
  const [statusEditName, setStatusEditName] = useState("");
  const [statusEditColor, setStatusEditColor] = useState("");
  const [statusEditIsDefault, setStatusEditIsDefault] = useState(false);
  const [statusEditIsCompleted, setStatusEditIsCompleted] = useState(false);
  const [statusIsAdding, setStatusIsAdding] = useState(false);
  const [statusNewName, setStatusNewName] = useState("");
  const [statusNewColor, setStatusNewColor] = useState("#9ca3af");

  // Layers tab state
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [layerEditingId, setLayerEditingId] = useState<string | null>(null);
  const [layerEditName, setLayerEditName] = useState("");
  const [layerEditColor, setLayerEditColor] = useState("");
  const [layerIsAdding, setLayerIsAdding] = useState(false);
  const [layerNewName, setLayerNewName] = useState("");
  const [layerNewColor, setLayerNewColor] = useState("#8b5cf6");

  // Access tab state
  const [accessEntries, setAccessEntries] = useState<AccessEntry[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [wsMembers, setWsMembers] = useState<MemberOption[]>([]);
  const [addingPrincipal, setAddingPrincipal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addRole, setAddRole] = useState<"Owner" | "Editor" | "Viewer">("Editor");

  // Sync props → local state when dialog reopens
  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description ?? "");
      setColor(project.color ?? "#6366f1");
      setIconUrl(project.iconUrl ?? "");
      setStatuses(initialStatuses);
      setLayers(initialLayers);
    }
  }, [open, project, initialStatuses, initialLayers]);

  // Load access data when Access tab is opened
  useEffect(() => {
    if (tab !== "access" || !open) return;
    const load = async () => {
      setAccessLoading(true);
      try {
        const [entriesRes, groupsRes, membersRes] = await Promise.all([
          fetch(`/api/projects/${project.id}/members`),
          fetch(`/api/workspaces/${workspaceId}/groups`),
          fetch(`/api/workspaces/${workspaceId}/members`),
        ]);
        if (entriesRes.ok) setAccessEntries(await entriesRes.json());
        if (groupsRes.ok) setGroups(await groupsRes.json());
        if (membersRes.ok) setWsMembers(await membersRes.json());
      } finally {
        setAccessLoading(false);
      }
    };
    load();
  }, [tab, open, project.id, workspaceId]);

  const addPrincipal = async (principalType: "user" | "group", principalId: string) => {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ principalType, principalId, role: addRole }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/projects/${project.id}/members`);
      if (updated.ok) setAccessEntries(await updated.json());
      setAddSearch("");
      setAddingPrincipal(false);
    }
  };

  const updateEntryRole = async (entryId: string, role: "Owner" | "Editor" | "Viewer") => {
    const res = await fetch(`/api/projects/${project.id}/members/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) setAccessEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, role } : e));
  };

  const removeEntry = async (entryId: string) => {
    const res = await fetch(`/api/projects/${project.id}/members/${entryId}`, { method: "DELETE" });
    if (res.ok) setAccessEntries((prev) => prev.filter((e) => e.id !== entryId));
    else {
      const err = await res.json();
      toast.error(err.error || "Failed to remove");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── General ──────────────────────────────────────────────────────────────────

  const saveGeneral = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string | null> = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        iconUrl: iconUrl.trim() || null,
      };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Project updated");
      onProjectUpdate?.({ name: name.trim(), description: description.trim() || null, color, iconUrl: iconUrl.trim() || null });
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Workflow ──────────────────────────────────────────────────────────────────

  const startStatusEdit = (s: Status) => {
    setStatusEditingId(s.id);
    setStatusEditName(s.name);
    setStatusEditColor(s.color || "#9ca3af");
    setStatusEditIsDefault(s.isDefault || false);
    setStatusEditIsCompleted(s.isCompleted || false);
  };
  const cancelStatusEdit = () => { setStatusEditingId(null); setStatusEditName(""); setStatusEditColor(""); };

  const saveStatusEdit = async () => {
    if (!statusEditingId || !statusEditName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/statuses/${statusEditingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: statusEditName.trim(), color: statusEditColor, isDefault: statusEditIsDefault, isCompleted: statusEditIsCompleted }),
      });
      if (!res.ok) throw new Error();
      setStatuses((prev) => prev.map((s) =>
        s.id === statusEditingId
          ? { ...s, name: statusEditName.trim(), color: statusEditColor, isDefault: statusEditIsDefault, isCompleted: statusEditIsCompleted }
          : statusEditIsDefault ? { ...s, isDefault: false } : s
      ));
      cancelStatusEdit();
      router.refresh();
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
  };

  const addStatus = async () => {
    if (!statusNewName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: statusNewName.trim(), color: statusNewColor }),
      });
      if (!res.ok) throw new Error();
      const s = await res.json();
      setStatuses((prev) => [...prev, s]);
      setStatusNewName(""); setStatusNewColor("#9ca3af"); setStatusIsAdding(false);
      router.refresh();
      toast.success("Status created");
    } catch { toast.error("Failed to create status"); }
  };

  const deleteStatus = async (id: string) => {
    if (!confirm("Delete this status? Tasks will be moved to the default status.")) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/statuses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setStatuses((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
      toast.success("Status deleted");
    } catch { toast.error("Failed to delete status"); }
  };

  const moveStatus = async (id: string, dir: "up" | "down") => {
    const idx = statuses.findIndex((s) => s.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === statuses.length - 1)) return;
    const next = [...statuses];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setStatuses(next);
    try {
      const res = await fetch(`/api/projects/${project.id}/statuses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch { setStatuses(statuses); toast.error("Failed to reorder"); }
  };

  // ── Layers ────────────────────────────────────────────────────────────────────

  const startLayerEdit = (l: Layer) => { setLayerEditingId(l.id); setLayerEditName(l.name); setLayerEditColor(l.color || "#6366f1"); };
  const cancelLayerEdit = () => { setLayerEditingId(null); setLayerEditName(""); setLayerEditColor(""); };

  const saveLayerEdit = async () => {
    if (!layerEditingId || !layerEditName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/layers/${layerEditingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: layerEditName.trim(), color: layerEditColor }),
      });
      if (!res.ok) throw new Error();
      setLayers((prev) => prev.map((l) => l.id === layerEditingId ? { ...l, name: layerEditName.trim(), color: layerEditColor } : l));
      cancelLayerEdit();
      router.refresh();
      toast.success("Layer updated");
    } catch { toast.error("Failed to update layer"); }
  };

  const addLayer = async () => {
    if (!layerNewName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/layers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: layerNewName.trim(), color: layerNewColor }),
      });
      if (!res.ok) throw new Error();
      const l = await res.json();
      setLayers((prev) => [...prev, l]);
      setLayerNewName(""); setLayerNewColor("#8b5cf6"); setLayerIsAdding(false);
      router.refresh();
      toast.success("Layer created");
    } catch { toast.error("Failed to create layer"); }
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer? Tasks will have their layer unset.")) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/layers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLayers((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
      toast.success("Layer deleted");
    } catch { toast.error("Failed to delete layer"); }
  };

  const handleLayerDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = layers.findIndex((l) => l.id === active.id);
    const newIdx = layers.findIndex((l) => l.id === over.id);
    const next = arrayMove(layers, oldIdx, newIdx);
    setLayers(next);
    try {
      const res = await fetch(`/api/projects/${project.id}/layers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((l) => l.id) }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch { setLayers(layers); toast.error("Failed to reorder layers"); }
  };

  const applyLayerPreset = async (key: PresetKey) => {
    const preset = PRESETS[key];
    try {
      for (const l of layers) await fetch(`/api/projects/${project.id}/layers/${l.id}`, { method: "DELETE" });
      setLayers([]);
      const next: Layer[] = [];
      for (const def of preset.layers) {
        const res = await fetch(`/api/projects/${project.id}/layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(def),
        });
        if (res.ok) next.push(await res.json());
      }
      setLayers(next);
      router.refresh();
      toast.success(`Applied "${preset.label}"`);
    } catch { toast.error("Failed to apply preset"); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: "general",  label: "General" },
    { key: "workflow", label: "Workflow" },
    { key: "layers",   label: "Layers" },
    { key: "access",   label: "Access" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Project Settings</SheetTitle>
        </SheetHeader>

        {/* Tab nav */}
        <div className="flex border-b border-border shrink-0 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                tab === t.key
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── General ── */}
          {tab === "general" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Name</Label>
                <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} maxLength={2000} className="resize-none" />
              </div>

              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {PROJECT_COLORS.map((c) => (
                      <button key={c} onClick={() => setColor(c)}
                        className={cn("w-6 h-6 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Input value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-24 h-7 font-mono text-xs" maxLength={7} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-icon">Icon URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex items-center gap-2">
                  {iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <Input id="proj-icon" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://…" maxLength={500} />
                </div>
              </div>

              <Separator />

              <Button onClick={saveGeneral} disabled={saving || !name.trim()} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save changes"}
              </Button>
            </>
          )}

          {/* ── Workflow ── */}
          {tab === "workflow" && (
            <>
              <p className="text-sm text-muted-foreground">Customize the statuses for tasks in this project.</p>
              <div className="space-y-2">
                {statuses.map((status, index) => (
                  <div key={status.id} className="flex items-center gap-2 p-2 border rounded-md">
                    {statusEditingId === status.id ? (
                      <div className="flex-1 space-y-2">
                        <Input value={statusEditName} onChange={(e) => setStatusEditName(e.target.value)} autoFocus />
                        <div className="flex gap-1">
                          {STATUS_COLORS.map((c) => (
                            <button key={c} onClick={() => setStatusEditColor(c)}
                              className={cn("w-5 h-5 rounded-full border-2", statusEditColor === c ? "border-foreground" : "border-transparent")}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={statusEditIsDefault} onCheckedChange={(v) => setStatusEditIsDefault(!!v)} />
                            Default
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={statusEditIsCompleted} onCheckedChange={(v) => setStatusEditIsCompleted(!!v)} />
                            Marks complete
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveStatusEdit}><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelStatusEdit}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button className="text-muted-foreground" onClick={() => moveStatus(status.id, "up")} disabled={index === 0}>
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: status.color || "#9ca3af" }} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{status.name}</span>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {status.isDefault && <span>Default</span>}
                            {status.isCompleted && <span>Completes task</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startStatusEdit(status)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStatus(status.id)} disabled={statuses.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {statusIsAdding ? (
                <div className="p-3 border rounded-md space-y-2">
                  <Input value={statusNewName} onChange={(e) => setStatusNewName(e.target.value)} placeholder="New status name" autoFocus />
                  <div className="flex gap-1">
                    {STATUS_COLORS.map((c) => (
                      <button key={c} onClick={() => setStatusNewColor(c)}
                        className={cn("w-5 h-5 rounded-full border-2", statusNewColor === c ? "border-foreground" : "border-transparent")}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addStatus} disabled={!statusNewName.trim()}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setStatusIsAdding(false); setStatusNewName(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setStatusIsAdding(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Status
                </Button>
              )}
            </>
          )}

          {/* ── Access ── */}
          {tab === "access" && (
            <>
              {accessLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Control who can access this project. Only workspace owner can bypass these settings.</p>

                  {/* Current entries */}
                  <div className="space-y-1">
                    {accessEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-2 rounded-md border border-border bg-background">
                        <span className={cn(
                          "inline-flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-medium",
                          entry.principalType === "group" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                        )}>
                          {entry.principalType === "group" ? "G" : entry.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.name}{entry.isDefault ? " (Everyone)" : ""}</p>
                          {entry.email && <p className="text-xs text-muted-foreground truncate">{entry.email}</p>}
                        </div>
                        <Select
                          value={entry.role}
                          onValueChange={(v) => updateEntryRole(entry.id, v as "Owner" | "Editor" | "Viewer")}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Owner">Owner</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {accessEntries.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">No access entries yet. Only the workspace owner can access this project.</p>
                    )}
                  </div>

                  {/* Add principal */}
                  {addingPrincipal ? (
                    <div className="space-y-2 p-3 border border-border rounded-md bg-background">
                      <Input
                        placeholder="Search user or group…"
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Role:</span>
                        <Select value={addRole} onValueChange={(v) => setAddRole(v as "Owner" | "Editor" | "Viewer")}>
                          <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Owner">Owner</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Results */}
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {groups
                          .filter((g) => g.name.toLowerCase().includes(addSearch.toLowerCase()) && !accessEntries.find((e) => e.principalType === "group" && e.principalId === g.id))
                          .map((g) => (
                            <button key={g.id} onClick={() => addPrincipal("group", g.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left">
                              <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs shrink-0">G</span>
                              <span className="truncate">{g.name}{g.isDefault ? " (Everyone)" : ""}</span>
                            </button>
                          ))}
                        {wsMembers
                          .filter((m) => (m.user.name + m.user.email).toLowerCase().includes(addSearch.toLowerCase()) && !accessEntries.find((e) => e.principalType === "user" && e.principalId === m.user.id))
                          .map((m) => (
                            <button key={m.user.id} onClick={() => addPrincipal("user", m.user.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left">
                              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                                {m.user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="truncate">{m.user.name}</span>
                              <span className="text-xs text-muted-foreground truncate">{m.user.email}</span>
                            </button>
                          ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setAddingPrincipal(false); setAddSearch(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setAddingPrincipal(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add user or group
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Layers ── */}
          {tab === "layers" && (
            <>
              <p className="text-sm text-muted-foreground">Define layers for your work breakdown structure.</p>

              {layers.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No layers yet. Choose a preset:</p>
                  {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                    <Button key={key} variant="outline" className="w-full justify-start" onClick={() => applyLayerPreset(key)}>
                      {PRESETS[key].label}
                    </Button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">Apply preset:</span>
                    <Select onValueChange={(v) => applyLayerPreset(v as PresetKey)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                          <SelectItem key={key} value={key}>{PRESETS[key].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayerDragEnd}>
                    <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {layers.map((layer, index) => (
                          <SortableLayerRow
                            key={layer.id} layer={layer} index={index}
                            isEditing={layerEditingId === layer.id}
                            editName={layerEditName} editColor={layerEditColor}
                            onEditNameChange={setLayerEditName} onEditColorChange={setLayerEditColor}
                            onSave={saveLayerEdit} onCancel={cancelLayerEdit}
                            onStartEdit={() => startLayerEdit(layer)}
                            onDelete={() => deleteLayer(layer.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {layerIsAdding ? (
                    <div className="p-3 border rounded-md space-y-2">
                      <Input value={layerNewName} onChange={(e) => setLayerNewName(e.target.value)} placeholder="New layer name" autoFocus />
                      <div className="flex gap-1">
                        {LAYER_COLORS.map((c) => (
                          <button key={c} onClick={() => setLayerNewColor(c)}
                            className={cn("w-5 h-5 rounded-full border-2", layerNewColor === c ? "border-foreground" : "border-transparent")}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addLayer} disabled={!layerNewName.trim()}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setLayerIsAdding(false); setLayerNewName(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setLayerIsAdding(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add Layer
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
