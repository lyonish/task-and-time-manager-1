"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { format, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Loader2,
  ExternalLink,
  Users,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskOption {
  id: string;
  title: string;
  project: { id: string; name: string; color: string };
}

interface WorkLog {
  id: string;
  taskId: string | null;
  estimatedStartTime: string | null;
  estimatedEndTime: string | null;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  detailNote: string | null;
  task: (TaskOption & { projectId: string }) | null;
}

interface GroupInfo {
  id: string;
  name: string;
  isDefault: boolean;
  members: { userId: string; user: { id: string; name: string; email: string; avatarUrl: string | null } }[];
}

interface TeamMember {
  user: { id: string; name: string; avatarUrl: string | null };
  logs: WorkLog[];
}

type SaveData = {
  taskId: string | null;
  estimatedStartTime: string | null;
  estimatedEndTime: string | null;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

function formatTime(dt: string | null) {
  if (!dt) return null;
  return format(new Date(dt), "HH:mm");
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function TimeCell({ time, dimmed }: { time: string | null; dimmed?: boolean }) {
  if (!time) return <span className="text-muted-foreground/30 font-mono text-sm">—</span>;
  return <span className={cn("font-mono text-sm", dimmed && "text-muted-foreground")}>{formatTime(time)}</span>;
}

// --- Searchable task combobox ---
function TaskCombobox({
  tasks,
  value,
  onChange,
}: {
  tasks: TaskOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = tasks.find((t) => t.id === value) ?? null;
  const [query, setQuery] = useState(selected?.title ?? "");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.project.name.toLowerCase().includes(q)
        )
      : tasks;
  }, [query, tasks]);

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  function select(id: string, title: string) {
    onChange(id);
    setQuery(title);
    setOpen(false);
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setQuery(selected?.title ?? "");
      setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, selected]);

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240), zIndex: 9999 }}
            className="max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              onPointerDown={(e) => { e.preventDefault(); select("none", ""); }}
            >
              No task
            </button>
            {filtered.map((t) => (
              <button
                key={t.id}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left", value === t.id && "bg-accent/60")}
                onPointerDown={(e) => { e.preventDefault(); select(t.id, t.title); }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.project.color }} />
                <span className="truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground ml-auto pl-2 truncate">{t.project.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="w-44">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        onKeyDown={(e) => { if (e.key === "Escape") { setQuery(selected?.title ?? ""); setOpen(false); } }}
        placeholder="No task"
        className="h-7 text-sm"
      />
      {dropdown}
    </div>
  );
}

// --- Inline row editor ---
function EditableRow({
  log,
  tasks,
  onSave,
  onDelete,
  onCancel,
}: {
  log: WorkLog;
  tasks: TaskOption[];
  onSave: (id: string, data: SaveData) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const baseDate = new Date(log.estimatedStartTime ?? log.startTime ?? new Date());

  const [estStart, setEstStart] = useState(log.estimatedStartTime ? format(new Date(log.estimatedStartTime), "HH:mm") : "");
  const [estEnd, setEstEnd] = useState(log.estimatedEndTime ? format(new Date(log.estimatedEndTime), "HH:mm") : "");
  const [actStart, setActStart] = useState(log.startTime ? format(new Date(log.startTime), "HH:mm") : "");
  const [actEnd, setActEnd] = useState(log.endTime ? format(new Date(log.endTime), "HH:mm") : "");
  const [taskId, setTaskId] = useState(log.taskId ?? "none");
  const [note, setNote] = useState(log.note ?? "");

  function buildDatetime(timeStr: string): string | null {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  return (
    <tr className="bg-accent/30">
      <td className="px-2 py-2">
        <Input type="time" value={estStart} onChange={(e) => setEstStart(e.target.value)} className="h-7 w-[4.5rem] text-sm text-muted-foreground" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={estEnd} onChange={(e) => setEstEnd(e.target.value)} className="h-7 w-[4.5rem] text-sm text-muted-foreground" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={actStart} onChange={(e) => setActStart(e.target.value)} className="h-7 w-[4.5rem] text-sm" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={actEnd} onChange={(e) => setActEnd(e.target.value)} className="h-7 w-[4.5rem] text-sm" />
      </td>
      <td className="px-2 py-2">
        <TaskCombobox tasks={tasks} value={taskId} onChange={setTaskId} />
      </td>
      <td className="px-2 py-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-7 text-sm" placeholder="Add a note..." />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => onSave(log.id, {
              taskId: taskId === "none" ? null : taskId,
              estimatedStartTime: buildDatetime(estStart),
              estimatedEndTime: buildDatetime(estEnd),
              startTime: buildDatetime(actStart),
              endTime: buildDatetime(actEnd),
              note: note || null,
            })}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(log.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// --- New entry form row ---
function NewLogRow({ date, tasks, onSave }: { date: Date; tasks: TaskOption[]; onSave: (data: SaveData) => void }) {
  const [estStart, setEstStart] = useState("");
  const [estEnd, setEstEnd] = useState("");
  const [actStart, setActStart] = useState("");
  const [actEnd, setActEnd] = useState("");
  const [taskId, setTaskId] = useState("none");
  const [note, setNote] = useState("");

  function buildDatetime(timeStr: string): string | null {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function handleSave() {
    if (!estStart && !actStart) return; // need at least one time anchor
    onSave({
      estimatedStartTime: buildDatetime(estStart),
      estimatedEndTime: buildDatetime(estEnd),
      startTime: buildDatetime(actStart),
      endTime: buildDatetime(actEnd),
      taskId: taskId === "none" ? null : taskId,
      note: note || null,
    });
  }

  return (
    <tr className="border-t-2 border-dashed border-border/60 bg-muted/20">
      <td className="px-2 py-2">
        <Input type="time" value={estStart} onChange={(e) => setEstStart(e.target.value)} className="h-7 w-[4.5rem] text-sm text-muted-foreground" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={estEnd} onChange={(e) => setEstEnd(e.target.value)} className="h-7 w-[4.5rem] text-sm text-muted-foreground" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={actStart} onChange={(e) => setActStart(e.target.value)} className="h-7 w-[4.5rem] text-sm" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={actEnd} onChange={(e) => setActEnd(e.target.value)} className="h-7 w-[4.5rem] text-sm" />
      </td>
      <td className="px-2 py-2">
        <TaskCombobox tasks={tasks} value={taskId} onChange={setTaskId} />
      </td>
      <td className="px-2 py-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 text-sm"
          placeholder="Add a note..."
        />
      </td>
      <td className="px-2 py-2">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// --- Read-only row with always-editable actual time inputs ---
function LogRow({
  log,
  workspaceId,
  date,
  onEdit,
  onPatch,
}: {
  log: WorkLog;
  workspaceId: string | null;
  date: Date;
  onEdit: () => void;
  onPatch: (id: string, data: { startTime?: string | null; endTime?: string | null; detailNote?: string | null }) => void;
}) {
  const baseDate = new Date(log.estimatedStartTime ?? log.startTime ?? date);

  const [expanded, setExpanded] = useState(false);
  const [actStart, setActStart] = useState(log.startTime ? format(new Date(log.startTime), "HH:mm") : "");
  const [actEnd, setActEnd] = useState(log.endTime ? format(new Date(log.endTime), "HH:mm") : "");
  const [detailNote, setDetailNote] = useState(log.detailNote ?? "");

  function buildDatetime(timeStr: string): string | null {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function handleBlur() {
    const newStart = buildDatetime(actStart);
    const newEnd = buildDatetime(actEnd);
    const prevStart = log.startTime;
    const prevEnd = log.endTime;
    if (newStart !== prevStart || newEnd !== prevEnd) {
      onPatch(log.id, { startTime: newStart, endTime: newEnd });
    }
  }

  const actDuration = formatDuration(buildDatetime(actStart), buildDatetime(actEnd));

  return (
    <>
    <tr className={cn("border-b last:border-0 hover:bg-accent/40 group", !expanded && !log.startTime && !actStart && "bg-muted/10")}>
      {/* Est. Start */}
      <td className="px-2 py-2">
        <TimeCell time={log.estimatedStartTime} dimmed />
      </td>
      {/* Est. End */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <TimeCell time={log.estimatedEndTime} dimmed />
          {log.estimatedEndTime && log.estimatedStartTime && (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(log.estimatedStartTime, log.estimatedEndTime)}
            </span>
          )}
        </div>
      </td>
      {/* Act. Start — always editable */}
      <td className="px-2 py-1.5">
        <Input
          type="time"
          value={actStart}
          onChange={(e) => setActStart(e.target.value)}
          onBlur={handleBlur}
          className="h-7 w-[4.5rem] text-sm"
        />
      </td>
      {/* Act. End — always editable */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            type="time"
            value={actEnd}
            onChange={(e) => setActEnd(e.target.value)}
            onBlur={handleBlur}
            className="h-7 w-[4.5rem] text-sm"
          />
          {actDuration && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
              <Clock className="h-2.5 w-2.5" />
              {actDuration}
            </span>
          )}
        </div>
      </td>
      {/* Task */}
      <td className="px-2 py-2">
        {log.task ? (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.task.project.color }} />
            <span className="text-sm truncate max-w-[180px]">{log.task.title}</span>
            <span className="text-xs text-muted-foreground truncate">· {log.task.project.name}</span>
            {workspaceId && (
              <a
                href={`/workspace/${workspaceId}/project/${log.task.project.id}?taskId=${log.task.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/30">—</span>
        )}
      </td>
      {/* Note */}
      <td className="px-2 py-2">
        <span className={cn("text-sm", !log.note && "text-muted-foreground/30")}>
          {log.note || "—"}
        </span>
      </td>
      {/* Actions */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
            title="Detail note"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !expanded && "-rotate-90")} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
    {expanded && (
      <tr className={cn("border-b last:border-0", !log.startTime && !actStart && "bg-muted/10")}>
        <td colSpan={4} />
        <td colSpan={2} className="pr-2 py-2 align-middle">
          <textarea
            value={detailNote}
            onChange={(e) => setDetailNote(e.target.value)}
            onBlur={() => {
              if (detailNote !== (log.detailNote ?? "")) {
                onPatch(log.id, { detailNote: detailNote || null });
              }
            }}
            placeholder="Add detail note…"
            rows={3}
            className="w-full text-sm bg-transparent border border-border rounded-md px-3 py-2 resize-y placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </td>
        <td />
      </tr>
    )}
    </>
  );
}

// --- Read-only row for team view ---
function TeamLogRow({ log, workspaceId }: { log: WorkLog; workspaceId: string | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-accent/40 group">
        <td className="px-2 py-2"><TimeCell time={log.estimatedStartTime} dimmed /></td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <TimeCell time={log.estimatedEndTime} dimmed />
            {log.estimatedStartTime && log.estimatedEndTime && (
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(log.estimatedStartTime, log.estimatedEndTime)}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2"><TimeCell time={log.startTime} /></td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1.5">
            <TimeCell time={log.endTime} />
            {log.startTime && log.endTime && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(log.startTime, log.endTime)}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2">
          {log.task ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.task.project.color }} />
              <span className="text-sm truncate max-w-[180px]">{log.task.title}</span>
              <span className="text-xs text-muted-foreground truncate">· {log.task.project.name}</span>
              {workspaceId && (
                <a
                  href={`/workspace/${workspaceId}/project/${log.task.project.id}?taskId=${log.task.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </a>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/30">—</span>
          )}
        </td>
        <td className="px-2 py-2">
          <span className={cn("text-sm", !log.note && "text-muted-foreground/30")}>{log.note || "—"}</span>
        </td>
        <td className="px-2 py-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
            title="Detail note"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !expanded && "-rotate-90")} />
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b last:border-0">
          <td colSpan={4} />
          <td colSpan={2} className="pr-2 pb-3 pt-1">
            <div className="w-full text-sm text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/20 whitespace-pre-wrap min-h-[60px]">
              {log.detailNote || <span className="text-muted-foreground/40 italic">No detail note</span>}
            </div>
          </td>
          <td />
        </tr>
      )}
    </>
  );
}

// --- Log table header ---
function LogTableHeader() {
  return (
    <tr className="border-b bg-muted/50">
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-wide w-24">Est. Start</th>
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-wide w-24">Est. End</th>
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">Act. Start</th>
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32">Act. End</th>
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Task</th>
      <th className="text-left px-2 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Note</th>
      <th className="w-20" />
    </tr>
  );
}

// --- Group selector dropdown ---
function GroupSelector({
  groups,
  selectedId,
  onSelect,
}: {
  groups: GroupInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const selected = groups.find((g) => g.id === selectedId);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, minWidth: rect.width, zIndex: 9999 }}
            className="rounded-md border border-border bg-popover shadow-md py-1"
          >
            {groups.map((g) => (
              <button
                key={g.id}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left", g.id === selectedId && "bg-accent/60")}
                onPointerDown={(e) => { e.preventDefault(); onSelect(g.id); setOpen(false); }}
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {g.name}
                <span className="ml-auto text-xs text-muted-foreground">{g.members.length} members</span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        onClick={() => {
          if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
          setOpen((v) => !v);
        }}
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{selected?.name ?? "Select group"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
      </button>
      {dropdown}
    </>
  );
}

export default function WorkLogsPage() {
  const [date, setDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"personal" | "team">("personal");

  // Personal view
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [newRowKey, setNewRowKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Team view
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(false);

  // Groups the current user is a member of
  const myGroups = useMemo(
    () => allGroups.filter((g) => !g.isDefault && g.members.some((m) => m.userId === currentUserId)),
    [allGroups, currentUserId]
  );

  const fetchLogs = useCallback(async (d: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(d, "yyyy-MM-dd");
      const res = await fetch(`/api/work-logs?date=${dateStr}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (wsId: string | null) => {
    const url = wsId ? `/api/my-tasks?workspaceId=${wsId}` : "/api/my-tasks";
    const res = await fetch(url);
    if (res.ok) setTasks(await res.json());
  }, []);

  const fetchTeamSchedule = useCallback(async (wsId: string, groupId: string, d: Date) => {
    setIsTeamLoading(true);
    try {
      const dateStr = format(d, "yyyy-MM-dd");
      const res = await fetch(`/api/workspaces/${wsId}/schedule?date=${dateStr}&groupId=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members);
      }
    } finally {
      setIsTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me: { id: string }) => setCurrentUserId(me.id));

    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((ws: { id: string }[]) => {
        const id = ws[0]?.id ?? null;
        setWorkspaceId(id);
        fetchTasks(id);
        if (id) {
          fetch(`/api/workspaces/${id}/groups`)
            .then((r) => r.json())
            .then((groups: GroupInfo[]) => {
              setAllGroups(groups);
              const firstNonDefault = groups.find((g) => !g.isDefault);
              if (firstNonDefault) setSelectedGroupId(firstNonDefault.id);
            });
        }
      });
  }, [fetchTasks]);

  useEffect(() => { fetchLogs(date); }, [date, fetchLogs]);

  useEffect(() => {
    if (viewMode === "team" && workspaceId && selectedGroupId) {
      fetchTeamSchedule(workspaceId, selectedGroupId, date);
    }
  }, [viewMode, workspaceId, selectedGroupId, date, fetchTeamSchedule]);

  const goPrev = () => setDate((d) => subDays(d, 1));
  const goNext = () => setDate((d) => addDays(d, 1));
  const goToday = () => setDate(new Date());

  const handleCreate = async (data: SaveData) => {
    const res = await fetch("/api/work-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setNewRowKey((k) => k + 1);
      fetchLogs(date);
    }
  };

  const handleSave = async (id: string, data: SaveData) => {
    const res = await fetch(`/api/work-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingId(null);
      fetchLogs(date);
    }
  };

  const handlePatch = async (id: string, data: { startTime?: string | null; endTime?: string | null; detailNote?: string | null }) => {
    await fetch(`/api/work-logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchLogs(date);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/work-logs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEditingId(null);
      fetchLogs(date);
    }
  };

  const dateLabel = isToday(date) ? "Today" : format(date, "EEEE");

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="relative flex items-center">
        <div>
          <h1 className="text-2xl font-bold">Schedule &amp; Log</h1>
          <p className="text-muted-foreground text-sm">Team schedule and activity records</p>
        </div>

        {/* Date navigation — absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
          <div className="w-28 flex items-center gap-1.5 text-sm text-muted-foreground">
            {(isLoading || isTeamLoading) && <><Loader2 className="h-4 w-4 animate-spin shrink-0" />Loading…</>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[140px]">
              <div className="font-semibold">{dateLabel}</div>
              <div className="text-xs text-muted-foreground">{format(date, "MMMM d, yyyy")}</div>
            </div>
            <Button variant="outline" size="sm" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} disabled={isToday(date)}>
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* View mode toggle + group selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/30">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-colors",
              viewMode === "personal" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setViewMode("personal")}
          >
            <User className="h-3.5 w-3.5" />
            My Schedule
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-colors",
              viewMode === "team" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setViewMode("team")}
          >
            <Users className="h-3.5 w-3.5" />
            Team
          </button>
        </div>

        {viewMode === "team" && myGroups.length > 0 && selectedGroupId && (
          <GroupSelector
            groups={myGroups}
            selectedId={selectedGroupId}
            onSelect={(id) => setSelectedGroupId(id)}
          />
        )}
      </div>

      {/* Personal view */}
      {viewMode === "personal" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><LogTableHeader /></thead>
            <tbody>
              {logs.map((log) =>
                editingId === log.id ? (
                  <EditableRow
                    key={log.id}
                    log={log}
                    tasks={tasks}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <LogRow
                    key={log.id}
                    log={log}
                    workspaceId={workspaceId}
                    date={date}
                    onEdit={() => setEditingId(log.id)}
                    onPatch={handlePatch}
                  />
                )
              )}
              <NewLogRow key={newRowKey} date={date} tasks={tasks} onSave={handleCreate} />
            </tbody>
          </table>
        </div>
      )}

      {/* Team view */}
      {viewMode === "team" && (
        <div className="space-y-10">
          {teamMembers.length === 0 && !isTeamLoading && (
            <div className="text-center text-muted-foreground py-12">No members in this group</div>
          )}
          {teamMembers.map((member) => (
            <div key={member.user.id} className="border rounded-lg overflow-hidden">
              {/* Member header */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-muted/40 border-b">
                {member.user.avatarUrl ? (
                  <img src={member.user.avatarUrl} alt={member.user.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">{member.user.name}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  {member.logs.length === 0 ? "No entries" : `${member.logs.length} ${member.logs.length === 1 ? "entry" : "entries"}`}
                </span>
              </div>
              <table className="w-full">
                <thead><LogTableHeader /></thead>
                <tbody>
                  {member.logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground/50">
                        No schedule entries for this day
                      </td>
                    </tr>
                  ) : (
                    member.logs.map((log) => (
                      <TeamLogRow key={log.id} log={log} workspaceId={workspaceId} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
