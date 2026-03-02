"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskOption {
  id: string;
  title: string;
  project: { id: string; name: string; color: string };
}

interface WorkLog {
  id: string;
  taskId: string | null;
  startTime: string;
  endTime: string | null;
  note: string | null;
  task: (TaskOption & { projectId: string }) | null;
}

function formatTime(dt: string | null) {
  if (!dt) return "—";
  return format(new Date(dt), "HH:mm");
}

function formatDuration(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
  onSave: (id: string, data: Partial<WorkLog>) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const [startTime, setStartTime] = useState(format(new Date(log.startTime), "HH:mm"));
  const [endTime, setEndTime] = useState(log.endTime ? format(new Date(log.endTime), "HH:mm") : "");
  const [taskId, setTaskId] = useState(log.taskId ?? "none");
  const [note, setNote] = useState(log.note ?? "");

  function buildDatetime(date: Date, timeStr: string): string | null {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  const baseDate = new Date(log.startTime);

  return (
    <tr className="bg-accent/30">
      {/* Start */}
      <td className="px-4 py-2">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="h-7 w-16 text-sm"
        />
      </td>
      {/* End */}
      <td className="px-4 py-2">
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="h-7 w-16 text-sm"
        />
      </td>
      {/* Task */}
      <td className="px-4 py-2">
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger className="h-7 text-sm w-48">
            <SelectValue placeholder="No task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No task</SelectItem>
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.project.color }}
                  />
                  {t.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      {/* Note */}
      <td className="px-4 py-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-7 text-sm"
          placeholder="Add a note..."
        />
      </td>
      {/* Actions */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() =>
              onSave(log.id, {
                taskId: taskId === "none" ? null : taskId,
                startTime: buildDatetime(baseDate, startTime) ?? log.startTime,
                endTime: buildDatetime(baseDate, endTime),
                note: note || null,
              })
            }
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(log.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// --- New log form row (always visible at bottom) ---
function NewLogRow({
  date,
  tasks,
  onSave,
}: {
  date: Date;
  tasks: TaskOption[];
  onSave: (data: {
    startTime: string;
    endTime: string | null;
    taskId: string | null;
    note: string | null;
  }) => void;
}) {
  const [startTime, setStartTime] = useState(format(new Date(), "HH:mm"));
  const [endTime, setEndTime] = useState("");
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
    onSave({
      startTime: buildDatetime(startTime) ?? new Date(date).toISOString(),
      endTime: buildDatetime(endTime),
      taskId: taskId === "none" ? null : taskId,
      note: note || null,
    });
  }

  return (
    <tr className="border-t-2 border-dashed border-border/60 bg-muted/20">
      <td className="px-4 py-2">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="h-7 w-16 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="h-7 w-16 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger className="h-7 text-sm w-48">
            <SelectValue placeholder="No task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No task</SelectItem>
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.project.color }}
                  />
                  {t.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 text-sm"
          placeholder="Add a note..."
        />
      </td>
      <td className="px-4 py-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-primary"
          onClick={handleSave}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

export default function WorkLogsPage() {
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [newRowKey, setNewRowKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/my-tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  useEffect(() => { fetchLogs(date); }, [date, fetchLogs]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const goPrev = () => setDate((d) => subDays(d, 1));
  const goNext = () => setDate((d) => addDays(d, 1));
  const goToday = () => setDate(new Date());

  const handleCreate = async (data: {
    startTime: string;
    endTime: string | null;
    taskId: string | null;
    note: string | null;
  }) => {
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

  const handleSave = async (id: string, data: Partial<WorkLog>) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Log</h1>
          <p className="text-muted-foreground text-sm">
            Team activity records
          </p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[140px]">
            <div className="font-semibold">{dateLabel}</div>
            <div className="text-xs text-muted-foreground">
              {format(date, "MMMM d, yyyy")}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(date) && (
            <Button variant="ghost" size="sm" onClick={goToday}>
              Today
            </Button>
          )}
        </div>

        {/* spacer to keep date nav centered */}
        <div className="w-24" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">
                Start
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">
                End
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Task
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Note
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                  Loading...
                </td>
              </tr>
            ) : (
              logs.map((log) =>
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
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-accent/40 group"
                  >
                    {/* Start */}
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-mono">{formatTime(log.startTime)}</span>
                    </td>
                    {/* End */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono">{formatTime(log.endTime)}</span>
                        {log.endTime && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDuration(log.startTime, log.endTime)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Task */}
                    <td className="px-4 py-2.5">
                      {log.task ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: log.task.project.color }}
                          />
                          <span className="text-sm truncate max-w-[200px]">
                            {log.task.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            · {log.task.project.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </td>
                    {/* Note */}
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "text-sm",
                        !log.note && "text-muted-foreground/50"
                      )}>
                        {log.note || "—"}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setEditingId(log.id); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              )
            )}
            <NewLogRow
              key={newRowKey}
              date={date}
              tasks={tasks}
              onSave={handleCreate}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
