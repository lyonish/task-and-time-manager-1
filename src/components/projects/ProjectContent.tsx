"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TaskList } from "@/components/tasks/TaskList";
import { ProjectSettings } from "@/components/projects/ProjectSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, MoreHorizontal, Plus, Save, Star } from "lucide-react";
import type { ViewConfig, ProjectView, WorkflowStatus, TaskLayer } from "@/lib/db/schema";
import { ProjectStatsPanel } from "@/components/stats/ProjectStatsPanel";

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
  assignee?: { id: string; name: string; avatarUrl: string | null } | null;
  status?: WorkflowStatus | null;
  layer?: TaskLayer | null;
  steps?: { id: string; statusId: string; isCompleted: boolean | null }[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ProjectContentProps {
  project: { id: string; workspaceId: string; name: string; description: string | null; color: string | null; iconUrl: string | null };
  statuses: WorkflowStatus[];
  layers: TaskLayer[];
  tasks: Task[];
  members: Member[];
  currentUserId: string;
  initialViews: ProjectView[];
}

const DEFAULT_CONFIG: ViewConfig = {
  groupBy: "none",
  viewMode: "list",
  isCompact: false,
  filters: { updatedWithinDays: 14, dueWithinNextDays: 14 },
};

export function ProjectContent({
  project, statuses, layers, tasks, members, currentUserId, initialViews,
}: ProjectContentProps) {
  const [activeTab, setActiveTab] = useState<"views" | "stats">("views");
  const [views, setViews] = useState<ProjectView[]>(initialViews);
  const defaultView = initialViews.find((v) => v.isDefault) ?? initialViews[0];
  const [activeViewId, setActiveViewId] = useState<string>(defaultView?.id ?? "");
  const [currentConfig, setCurrentConfig] = useState<ViewConfig>(defaultView?.config ?? DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // New view dialog
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const activeView = views.find((v) => v.id === activeViewId);

  const switchView = (view: ProjectView) => {
    setActiveViewId(view.id);
    setCurrentConfig(view.config);
    setIsDirty(false);
  };

  const handleConfigChange = (config: ViewConfig) => {
    setCurrentConfig(config);
    if (activeView) {
      const dirty = JSON.stringify(config) !== JSON.stringify(activeView.config);
      setIsDirty(dirty);
    }
  };

  const saveView = async () => {
    if (!activeViewId || !isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/views/${activeViewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: currentConfig }),
      });
      if (res.ok) {
        setViews((prev) =>
          prev.map((v) => (v.id === activeViewId ? { ...v, config: currentConfig } : v))
        );
        setIsDirty(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const createView = async () => {
    const name = newViewName.trim() || "New View";
    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: currentConfig }),
      });
      if (res.ok) {
        const created: ProjectView = await res.json();
        setViews((prev) => [...prev, created]);
        setActiveViewId(created.id);
        setCurrentConfig(created.config);
        setIsDirty(false);
        setNewViewOpen(false);
        setNewViewName("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const renameView = async () => {
    if (!renamingViewId) return;
    const name = renameValue.trim();
    if (!name) return;
    const res = await fetch(`/api/projects/${project.id}/views/${renamingViewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setViews((prev) => prev.map((v) => (v.id === renamingViewId ? { ...v, name } : v)));
      setRenameOpen(false);
    }
  };

  const deleteView = async (viewId: string) => {
    const res = await fetch(`/api/projects/${project.id}/views/${viewId}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = views.filter((v) => v.id !== viewId);
      setViews(remaining);
      if (activeViewId === viewId) {
        const next = remaining.find((v) => v.isDefault) ?? remaining[0];
        if (next) {
          setActiveViewId(next.id);
          setCurrentConfig(next.config);
          setIsDirty(false);
        }
      }
    }
  };

  const setDefaultView = async (viewId: string) => {
    const res = await fetch(`/api/projects/${project.id}/views/${viewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === viewId })));
    }
  };

  const openRename = (view: ProjectView) => {
    setRenamingViewId(view.id);
    setRenameValue(view.name);
    setRenameOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="border-b border-border px-6 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.iconUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: project.color || "#6366f1" }} />
            )}
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="secondary" size="sm" className="h-7 gap-1.5 text-xs" onClick={saveView} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving…" : "Save view"}
              </Button>
            )}
            <ProjectSettings
              project={project}
              statuses={statuses}
              layers={layers}
              workspaceId={project.workspaceId}
              currentUserId={currentUserId}
              onProjectUpdate={(updated) => {
                if (updated.name) project.name = updated.name;
              }}
            />
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        )}

        {/* View Tabs */}
        <div className="flex items-center gap-0.5 mt-3 -mb-px overflow-x-auto">
          {views.map((view) => (
            <div key={view.id} className="flex items-center group shrink-0">
              <button
                onClick={() => switchView(view)}
                className={cn(
                  "px-3 py-1.5 text-sm border-b-2 transition-colors whitespace-nowrap",
                  activeViewId === view.id
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {view.isDefault && (
                  <Star className="inline h-3 w-3 mr-1 text-amber-500 fill-amber-500" />
                )}
                {view.name}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "h-6 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent mb-px",
                      activeViewId === view.id && "opacity-100"
                    )}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuItem onClick={() => openRename(view)}>
                    Rename
                  </DropdownMenuItem>
                  {!view.isDefault && (
                    <DropdownMenuItem onClick={() => setDefaultView(view.id)}>
                      <Star className="h-3.5 w-3.5 mr-2" />
                      Set as default
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={views.length <= 1}
                    onClick={() => deleteView(view.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {/* Add view */}
          <button
            onClick={() => { setNewViewName(""); setNewViewOpen(true); }}
            className="ml-1 mb-px h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title="Add view"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Stats tab separator + button */}
          <div className="ml-3 pl-3 border-l border-border flex items-center shrink-0">
            <button
              onClick={() => setActiveTab(activeTab === "stats" ? "views" : "stats")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm border-b-2 transition-colors whitespace-nowrap",
                activeTab === "stats"
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Stats
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "stats" ? (
          <ProjectStatsPanel projectId={project.id} />
        ) : (
        <TaskList
          key={activeViewId}
          projectId={project.id}
          statuses={statuses}
          layers={layers}
          tasks={tasks}
          members={members}
          currentUserId={currentUserId}
          initialGroupBy={currentConfig.groupBy}
          initialViewMode={currentConfig.viewMode}
          initialIsCompact={currentConfig.isCompact}
          initialFilters={currentConfig.filters}
          onConfigChange={handleConfigChange}
        />
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameView()}
              maxLength={100}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={renameView} disabled={!renameValue.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New view dialog */}
      <Dialog open={newViewOpen} onOpenChange={setNewViewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-view-name">Name</Label>
            <Input
              id="new-view-name"
              placeholder="e.g. My Tasks, By Priority…"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createView()}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The current group-by and compact settings will be saved to this view.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewViewOpen(false)}>Cancel</Button>
            <Button onClick={createView} disabled={isCreating}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
