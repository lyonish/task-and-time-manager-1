"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextDisplay } from "@/components/ui/rich-text-display";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Plus, Trash2, CheckCircle2,
  ArrowRight, User, Calendar, Edit, FileText,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

type ActivityAction =
  | "task_created" | "task_updated" | "task_deleted" | "task_completed"
  | "task_assigned" | "task_status_changed" | "task_due_date_changed"
  | "comment_added" | "mention_created" | "project_created" | "project_updated"
  | "member_added" | "member_removed" | "member_role_changed";

interface ActivityEntry {
  id: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface TaskHistoryProps {
  taskId: string;
  members: Member[];
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  priority: "Priority",
  dueDate: "Due date",
  assigneeId: "Assignee",
  layerId: "Layer",
  parentTaskId: "Parent task",
  estimatedHours: "Estimated hours",
};

function formatValue(field: string, value: unknown, members: Member[]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "assigneeId") {
    const m = members.find((m) => m.id === value);
    return m ? m.name : String(value);
  }
  if (field === "dueDate") {
    try { return new Date(value as string).toLocaleDateString(); } catch { return String(value); }
  }
  if (field === "description") return String(value);
  return String(value);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function FieldDiff({
  field, oldVal, newVal, members,
}: {
  field: string; oldVal: unknown; newVal: unknown; members: Member[];
}) {
  const [expanded, setExpanded] = useState(false);
  const label = FIELD_LABELS[field] ?? field;
  const isDescription = field === "description";

  if (isDescription) {
    return (
      <div className="mt-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <FileText className="h-3 w-3" />
          <span>{label} changed</span>
        </button>
        {expanded && (
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
            {!!oldVal && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Before</p>
                <div className="rounded border border-border bg-muted/40 px-3 py-2 text-xs opacity-75">
                  <RichTextDisplay content={String(oldVal)} />
                </div>
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">After</p>
              <div className="rounded border border-border bg-background px-3 py-2 text-xs">
                <RichTextDisplay content={String(newVal ?? "")} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs mt-0.5 flex-wrap">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("px-1 rounded", oldVal ? "line-through text-muted-foreground" : "text-muted-foreground italic")}>
        {formatValue(field, oldVal, members)}
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="font-medium">{formatValue(field, newVal, members)}</span>
    </div>
  );
}

function EntryIcon({ action }: { action: ActivityAction }) {
  const base = "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs";
  switch (action) {
    case "task_created": return <div className={cn(base, "bg-green-100 dark:bg-green-900 text-green-600")}><Plus className="h-3 w-3" /></div>;
    case "task_deleted": return <div className={cn(base, "bg-red-100 dark:bg-red-900 text-red-600")}><Trash2 className="h-3 w-3" /></div>;
    case "task_completed": return <div className={cn(base, "bg-green-100 dark:bg-green-900 text-green-600")}><CheckCircle2 className="h-3 w-3" /></div>;
    case "task_status_changed": return <div className={cn(base, "bg-blue-100 dark:bg-blue-900 text-blue-600")}><ArrowRight className="h-3 w-3" /></div>;
    case "task_assigned": return <div className={cn(base, "bg-purple-100 dark:bg-purple-900 text-purple-600")}><User className="h-3 w-3" /></div>;
    case "task_due_date_changed": return <div className={cn(base, "bg-orange-100 dark:bg-orange-900 text-orange-600")}><Calendar className="h-3 w-3" /></div>;
    default: return <div className={cn(base, "bg-muted text-muted-foreground")}><Edit className="h-3 w-3" /></div>;
  }
}

function ActivityEntry({ entry, members }: { entry: ActivityEntry; members: Member[] }) {
  const m = entry.metadata ?? {};

  let summary: React.ReactNode = null;

  if (entry.action === "task_created") {
    summary = <span className="text-sm">created this task</span>;
  } else if (entry.action === "task_completed") {
    summary = <span className="text-sm">marked as complete</span>;
  } else if (entry.action === "task_status_changed") {
    const oldStatus = m.oldStatus ? String(m.oldStatus) : null;
    const newStatus = m.newStatus ? String(m.newStatus) : null;
    summary = (
      <span className="text-sm flex items-center gap-1 flex-wrap">
        changed status
        {oldStatus && <><span className="text-muted-foreground line-through text-xs">{oldStatus}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /></>}
        {newStatus && <span className="font-medium text-xs">{newStatus}</span>}
      </span>
    );
  } else if (entry.action === "task_updated" && m.changes && typeof m.changes === "object") {
    const changes = m.changes as Record<string, { old: unknown; new: unknown }>;
    const fields = Object.keys(changes);
    if (fields.length === 0) return null;
    summary = (
      <div>
        <span className="text-sm">updated</span>
        <div className="mt-1 space-y-0.5">
          {fields.map((field) => (
            <FieldDiff key={field} field={field} oldVal={changes[field].old} newVal={changes[field].new} members={members} />
          ))}
        </div>
      </div>
    );
  } else {
    return null;
  }

  if (!summary) return null;

  const initials = entry.user.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex gap-2.5 py-2">
      <EntryIcon action={entry.action} />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <Avatar className="h-4 w-4 shrink-0">
            <AvatarImage src={entry.user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">{entry.user.name}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
        </div>
        <div className="mt-0.5 pl-5">{summary}</div>
      </div>
    </div>
  );
}

export function TaskHistory({ taskId, members }: TaskHistoryProps) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (entries !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity`);
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!expanded) load();
    setExpanded((v) => !v);
  };

  const visibleEntries = (entries ?? []).filter((e) => {
    if (e.action === "task_updated") {
      const changes = (e.metadata?.changes ?? {}) as Record<string, unknown>;
      return Object.keys(changes).length > 0;
    }
    return ["task_created", "task_completed", "task_status_changed"].includes(e.action);
  });

  return (
    <div className="border-t pt-4">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        History
        {entries !== null && (
          <span className="ml-1 text-xs font-normal">({visibleEntries.length})</span>
        )}
      </button>

      {expanded && (
        <div className="mt-1">
          {loading && (
            <p className="text-xs text-muted-foreground py-3 pl-6">Loading…</p>
          )}
          {!loading && visibleEntries.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 pl-6">No history yet.</p>
          )}
          {!loading && visibleEntries.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} members={members} />
          ))}
        </div>
      )}
    </div>
  );
}
