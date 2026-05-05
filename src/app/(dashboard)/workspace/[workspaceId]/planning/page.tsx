"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  isWeekend,
  differenceInCalendarDays,
  parseISO,
  max as dateMax,
  min as dateMin,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, ArrowLeft } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewType = "week" | "2week" | "month";
type GroupMode = "member" | "project";

interface WorkspaceMember {
  userId: string;
  role: string;
  isOwner: boolean;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Project {
  id: string;
  name: string;
  color: string | null;
}

interface UserGroup {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string | null;
  title: string;
  startDate: string;
  endDate: string;
  estimatedHours: string;
  note: string | null;
  createdBy: string;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; name: string; color: string | null } | null;
}

interface Capacity {
  hoursPerDay: number;
  daysPerWeek: number;
}

interface MemberRow {
  user: WorkspaceMember["user"];
  role: string;
  capacity: Capacity;
  assignments: Assignment[];
}

interface ModalState {
  open: boolean;
  editing: Assignment | null;
  prefillUserId?: string;
  prefillStartDate?: string;
}

// ─── Column helpers ───────────────────────────────────────────────────────────

interface ColumnUnit {
  start: Date;
  end: Date;
  label: string;
  groupLabel: string;
}

interface ColGroup {
  label: string;
  colCount: number;
}

// Column counts: week ≈ 6 months, 2week ≈ 1 year, month = 2 years
const COL_COUNTS: Record<ViewType, number> = { week: 26, "2week": 26, month: 24 };
const COL_WIDTHS: Record<ViewType, number> = { week: 120, "2week": 140, month: 160 };
const BAR_HEIGHT = 24;

function getVisibleColumns(pivot: Date, view: ViewType): ColumnUnit[] {
  const count = COL_COUNTS[view];
  if (view === "week") {
    const anchor = startOfWeek(pivot, { weekStartsOn: 1 });
    return Array.from({ length: count }, (_, i) => {
      const start = addWeeks(anchor, i);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `${format(start, "M/d")}–${format(end, "M/d")}`,
        groupLabel: format(start, "MMM yyyy"),
      };
    });
  } else if (view === "2week") {
    const anchor = startOfWeek(pivot, { weekStartsOn: 1 });
    return Array.from({ length: count }, (_, i) => {
      const start = addWeeks(anchor, i * 2);
      const end = endOfWeek(addWeeks(start, 1), { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `${format(start, "M/d")}–${format(end, "M/d")}`,
        groupLabel: format(start, "MMM yyyy"),
      };
    });
  } else {
    const anchor = startOfMonth(pivot);
    return Array.from({ length: count }, (_, i) => {
      const start = addMonths(anchor, i);
      const end = endOfMonth(start);
      return {
        start,
        end,
        label: format(start, "MMM"),
        groupLabel: format(start, "yyyy"),
      };
    });
  }
}

function getColGroups(columns: ColumnUnit[]): ColGroup[] {
  const groups: ColGroup[] = [];
  for (const col of columns) {
    const last = groups[groups.length - 1];
    if (last && last.label === col.groupLabel) {
      last.colCount++;
    } else {
      groups.push({ label: col.groupLabel, colCount: 1 });
    }
  }
  return groups;
}

function formatDateYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function countWeekdays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const DEFAULT_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

// ─── Track assignment for overlapping bars ────────────────────────────────────

function assignTracks(assignments: Assignment[]): Map<string, number> {
  const trackMap = new Map<string, number>();
  const trackEndDates: string[] = [];

  const sorted = [...assignments].sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const a of sorted) {
    let track = trackEndDates.findIndex((endDate) => a.startDate > endDate);
    if (track === -1) {
      track = trackEndDates.length;
      trackEndDates.push(a.endDate);
    } else {
      trackEndDates[track] = a.endDate;
    }
    trackMap.set(a.id, track);
  }

  return trackMap;
}

const BASE_ROW_HEIGHT = 56;

function calcRowHeight(maxTrack: number): number {
  return BASE_ROW_HEIGHT + maxTrack * Math.ceil(BAR_HEIGHT * 4 / 5);
}

// ─── Per-column capacity ──────────────────────────────────────────────────────

function colAssignedHours(col: ColumnUnit, assignments: Assignment[]): number {
  const colStartStr = formatDateYMD(col.start);
  const colEndStr = formatDateYMD(col.end);
  return assignments
    .filter((a) => a.startDate <= colEndStr && a.endDate >= colStartStr)
    .reduce((sum, a) => {
      const aStart = parseISO(a.startDate);
      const aEnd = parseISO(a.endDate);
      const overlapStart = dateMax([aStart, col.start]);
      const overlapEnd = dateMin([aEnd, col.end]);
      const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1;
      const totalDays = differenceInCalendarDays(aEnd, aStart) + 1;
      return sum + (parseFloat(a.estimatedHours) * overlapDays) / totalDays;
    }, 0);
}

function colAvailableHours(col: ColumnUnit, capacity: Capacity): number {
  const weekdays = countWeekdays(col.start, col.end);
  const workingDays = weekdays * (capacity.daysPerWeek / 5);
  return workingDays * capacity.hoursPerDay;
}

// ─── Planning Page ────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [viewType, setViewType] = useState<ViewType>("month");
  const [pivot, setPivot] = useState<Date>(new Date());
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [capacities, setCapacities] = useState<Record<string, Capacity>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [groupMemberIds, setGroupMemberIds] = useState<Record<string, string[]>>({});
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>("member");

  const columns = getVisibleColumns(pivot, viewType);
  const colGroups = getColGroups(columns);
  const visibleStart = columns[0].start;
  const visibleEnd = columns[columns.length - 1].end;
  const totalVisibleDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;
  const visibleStartStr = formatDateYMD(visibleStart);
  const visibleEndStr = formatDateYMD(visibleEnd);
  const cw = COL_WIDTHS[viewType];
  const totalTimelineWidth = columns.length * cw;

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, assignmentsRes, projectsRes, groupsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/members`),
        fetch(
          `/api/workspaces/${workspaceId}/planned-assignments?startDate=${visibleStartStr}&endDate=${visibleEndStr}`
        ),
        fetch(`/api/workspaces/${workspaceId}/projects`),
        fetch(`/api/workspaces/${workspaceId}/groups`),
      ]);

      const [membersData, assignmentsData, projectsData, groupsData] = await Promise.all([
        membersRes.ok ? membersRes.json() : [],
        assignmentsRes.ok ? assignmentsRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        groupsRes.ok ? groupsRes.json() : [],
      ]);

      setMembers(membersData);
      setAssignments(assignmentsData);
      setProjects(projectsData);
      setGroups(groupsData);

      const caps: Record<string, Capacity> = {};
      await Promise.all(
        (membersData as WorkspaceMember[]).map(async (m) => {
          const res = await fetch(
            `/api/workspaces/${workspaceId}/members/${m.userId}/capacity`
          );
          caps[m.userId] = res.ok
            ? await res.json()
            : { hoursPerDay: 8, daysPerWeek: 5 };
        })
      );
      setCapacities(caps);

      const gmi: Record<string, string[]> = {};
      await Promise.all(
        (groupsData as UserGroup[]).map(async (g) => {
          const res = await fetch(
            `/api/workspaces/${workspaceId}/groups/${g.id}/members`
          );
          gmi[g.id] = res.ok
            ? ((await res.json()) as Array<{ userId: string }>).map((d) => d.userId)
            : [];
        })
      );
      setGroupMemberIds(gmi);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, visibleStartStr, visibleEndStr]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigatePrev() {
    if (viewType === "week") setPivot((p) => subWeeks(p, 1));
    else if (viewType === "2week") setPivot((p) => subWeeks(p, 2));
    else setPivot((p) => subMonths(p, 1));
  }

  function navigateNext() {
    if (viewType === "week") setPivot((p) => addWeeks(p, 1));
    else if (viewType === "2week") setPivot((p) => addWeeks(p, 2));
    else setPivot((p) => addMonths(p, 1));
  }

  function periodLabel(): string {
    const s = columns[0].start;
    const e = columns[columns.length - 1].end;
    if (viewType === "month") {
      return `${format(s, "MMM yyyy")} – ${format(e, "MMM yyyy")}`;
    }
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }

  // ── Member rows ─────────────────────────────────────────────────────────────

  const filteredMembers = members.filter((m) => {
    if (selectedGroupId === "all") return true;
    return (groupMemberIds[selectedGroupId] ?? []).includes(m.userId);
  });

  const memberRows: MemberRow[] = filteredMembers.map((m) => ({
    user: m.user,
    role: m.role,
    capacity: capacities[m.userId] ?? { hoursPerDay: 8, daysPerWeek: 5 },
    assignments: assignments.filter((a) => a.userId === m.userId),
  }));

  // Precompute tracks and row heights
  const memberMeta = memberRows.map((row) => {
    const trackMap = assignTracks(row.assignments);
    const maxTrack = trackMap.size > 0 ? Math.max(...Array.from(trackMap.values())) : 0;
    return { trackMap, rowHeight: calcRowHeight(maxTrack) };
  });

  // ── Project rows (by-project view) ─────────────────────────────────────────

  function getMemberColor(userId: string): string {
    const idx = members.findIndex((m) => m.userId === userId);
    return DEFAULT_COLORS[(idx >= 0 ? idx : userId.charCodeAt(0)) % DEFAULT_COLORS.length];
  }

  interface ProjectRow {
    project: Project | null;
    assignments: Assignment[];
  }

  const projectRows: ProjectRow[] = (() => {
    const groupFilterIds = selectedGroupId !== "all" ? (groupMemberIds[selectedGroupId] ?? []) : null;
    const visible = assignments.filter((a) => {
      if (a.startDate > visibleEndStr || a.endDate < visibleStartStr) return false;
      if (groupFilterIds && !groupFilterIds.includes(a.userId)) return false;
      return true;
    });

    const map = new Map<string | null, Assignment[]>();
    for (const a of visible) {
      const key = a.projectId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }

    const rows: ProjectRow[] = [];
    for (const [pid, assigns] of map) {
      if (pid !== null) {
        const project = projects.find((p) => p.id === pid) ?? null;
        rows.push({ project, assignments: assigns });
      }
    }
    rows.sort((a, b) => (a.project?.name ?? "").localeCompare(b.project?.name ?? ""));
    if (map.has(null)) rows.push({ project: null, assignments: map.get(null)! });
    return rows;
  })();

  const projectMeta = projectRows.map((row) => {
    const trackMap = assignTracks(row.assignments);
    const maxTrack = trackMap.size > 0 ? Math.max(...Array.from(trackMap.values())) : 0;
    return { trackMap, rowHeight: calcRowHeight(maxTrack) };
  });

  // ── Bar position ────────────────────────────────────────────────────────────

  function barStyle(assignment: Assignment): { left: string; width: string } | null {
    const aStart = parseISO(assignment.startDate);
    const aEnd = parseISO(assignment.endDate);
    const startOffset = differenceInCalendarDays(aStart, visibleStart);
    const endOffset = differenceInCalendarDays(aEnd, visibleStart) + 1;
    const clampedStart = Math.max(0, startOffset);
    const clampedEnd = Math.min(totalVisibleDays, endOffset);
    const widthDays = clampedEnd - clampedStart;
    if (widthDays <= 0) return null;
    return {
      left: `${(clampedStart / totalVisibleDays) * 100}%`,
      width: `${(widthDays / totalVisibleDays) * 100}%`,
    };
  }

  // ── Modal handlers ──────────────────────────────────────────────────────────

  function openCreate(userId?: string, startDate?: string) {
    setModal({ open: true, editing: null, prefillUserId: userId, prefillStartDate: startDate });
  }

  function openEdit(assignment: Assignment) {
    setModal({ open: true, editing: assignment });
  }

  function closeModal() {
    setModal({ open: false, editing: null });
  }

  async function handleSave(formData: AssignmentFormData) {
    if (modal.editing) {
      await fetch(
        `/api/workspaces/${workspaceId}/planned-assignments/${modal.editing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
    } else {
      await fetch(`/api/workspaces/${workspaceId}/planned-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    }
    closeModal();
    fetchAll();
  }

  async function handleDelete(assignmentId: string) {
    await fetch(
      `/api/workspaces/${workspaceId}/planned-assignments/${assignmentId}`,
      { method: "DELETE" }
    );
    closeModal();
    fetchAll();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link
          href={`/workspace/${workspaceId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-lg font-semibold">Assignment Plan</h1>

        <div className="flex-1" />

        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex border border-border rounded-md overflow-hidden">
          {(["member", "project"] as GroupMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setGroupMode(v)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                groupMode === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {v === "member" ? "By Member" : "By Project"}
            </button>
          ))}
        </div>

        <div className="flex border border-border rounded-md overflow-hidden">
          {(["week", "2week", "month"] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewType(v)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                viewType === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {v === "week" ? "Week" : v === "2week" ? "2-Week" : "Month"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">
            {periodLabel()}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button size="sm" onClick={() => openCreate()} className="gap-1 h-8">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </header>

      {/* Gantt grid */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="flex">
              {/* Left fixed column */}
              <div className="w-44 shrink-0 sticky left-0 z-20 bg-background border-r border-border">
                <div className="border-b border-border" style={{ height: 60 }} />
                {groupMode === "member"
                  ? memberRows.map((row, ri) => (
                      <div
                        key={row.user.id}
                        className="flex items-center gap-2 px-3 border-b border-border"
                        style={{ height: memberMeta[ri].rowHeight }}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(row.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium truncate leading-tight">
                            {row.user.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{row.role}</span>
                        </div>
                      </div>
                    ))
                  : projectRows.map((row, ri) => (
                      <div
                        key={row.project?.id ?? "no-project"}
                        className="flex items-center gap-2 px-3 border-b border-border"
                        style={{ height: projectMeta[ri].rowHeight }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.project?.color ?? "#9ca3af" }}
                        />
                        <span className="text-xs font-medium truncate leading-tight">
                          {row.project?.name ?? "No Project"}
                        </span>
                      </div>
                    ))}
              </div>

              {/* Timeline area */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: totalTimelineWidth }}>
                  {/* Top row: group labels */}
                  <div className="flex border-b border-border sticky top-0 z-10 bg-background" style={{ height: 28 }}>
                    {colGroups.map((g, i) => (
                      <div
                        key={i}
                        style={{ width: g.colCount * cw }}
                        className="shrink-0 flex items-center px-3 border-r border-border/50"
                      >
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {g.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row: column unit labels */}
                  <div className="flex border-b border-border sticky top-7 z-10 bg-background" style={{ height: 32 }}>
                    {columns.map((col, i) => (
                      <div
                        key={i}
                        style={{ width: cw }}
                        className="shrink-0 flex items-center justify-center border-r border-border/50"
                      >
                        <span className="text-xs font-medium text-foreground text-center leading-tight px-1">
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {groupMode === "member"
                    ? memberRows.map((row, ri) => {
                        const { trackMap, rowHeight } = memberMeta[ri];
                        return (
                          <div
                            key={row.user.id}
                            className="flex border-b border-border relative"
                            style={{ height: rowHeight }}
                          >
                            {columns.map((col, ci) => {
                              const assigned = colAssignedHours(col, row.assignments);
                              const available = colAvailableHours(col, row.capacity);
                              const over = available > 0 && assigned > available;
                              return (
                                <div
                                  key={ci}
                                  style={{ width: cw }}
                                  className={cn(
                                    "shrink-0 h-full border-r border-border/50 cursor-pointer transition-colors",
                                    over
                                      ? "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                                      : "hover:bg-muted/20"
                                  )}
                                  onClick={() => openCreate(row.user.id, formatDateYMD(col.start))}
                                />
                              );
                            })}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="relative h-full">
                                {row.assignments.map((assignment) => {
                                  const bs = barStyle(assignment);
                                  if (!bs) return null;
                                  const track = trackMap.get(assignment.id) ?? 0;
                                  const topPx = 8 + track * Math.ceil(BAR_HEIGHT * 4 / 5);
                                  const widthPx = (parseFloat(bs.width) / 100) * totalTimelineWidth;
                                  const color =
                                    assignment.project?.color ??
                                    DEFAULT_COLORS[assignment.userId.charCodeAt(0) % DEFAULT_COLORS.length];
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="absolute rounded pointer-events-auto cursor-pointer hover:brightness-90 transition-all flex items-center px-1.5 overflow-hidden"
                                      style={{
                                        left: bs.left,
                                        width: bs.width,
                                        top: topPx,
                                        height: BAR_HEIGHT,
                                        backgroundColor: color,
                                        opacity: 0.9,
                                      }}
                                      onClick={(e) => { e.stopPropagation(); openEdit(assignment); }}
                                      title={`${assignment.title} (${assignment.estimatedHours}h)`}
                                    >
                                      {widthPx > 60 && (
                                        <span className="text-[11px] text-white font-medium truncate leading-none">
                                          {assignment.title}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    : projectRows.map((row, ri) => {
                        const { trackMap, rowHeight } = projectMeta[ri];
                        return (
                          <div
                            key={row.project?.id ?? "no-project"}
                            className="flex border-b border-border relative"
                            style={{ height: rowHeight }}
                          >
                            {columns.map((col, ci) => (
                              <div
                                key={ci}
                                style={{ width: cw }}
                                className="shrink-0 h-full border-r border-border/50 hover:bg-muted/20 transition-colors"
                              />
                            ))}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="relative h-full">
                                {row.assignments.map((assignment) => {
                                  const bs = barStyle(assignment);
                                  if (!bs) return null;
                                  const track = trackMap.get(assignment.id) ?? 0;
                                  const topPx = 8 + track * Math.ceil(BAR_HEIGHT * 4 / 5);
                                  const widthPx = (parseFloat(bs.width) / 100) * totalTimelineWidth;
                                  const color = getMemberColor(assignment.userId);
                                  const memberName = assignment.assignee?.name ?? "";
                                  return (
                                    <div
                                      key={assignment.id}
                                      className="absolute rounded pointer-events-auto cursor-pointer hover:brightness-90 transition-all flex items-center px-1.5 overflow-hidden"
                                      style={{
                                        left: bs.left,
                                        width: bs.width,
                                        top: topPx,
                                        height: BAR_HEIGHT,
                                        backgroundColor: color,
                                        opacity: 0.9,
                                      }}
                                      onClick={(e) => { e.stopPropagation(); openEdit(assignment); }}
                                      title={`${memberName} · ${assignment.title} (${assignment.estimatedHours}h)`}
                                    >
                                      {widthPx > 60 && (
                                        <span className="text-[11px] text-white font-medium truncate leading-none">
                                          {memberName}{widthPx > 120 ? ` · ${assignment.title}` : ""}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <AssignmentModal
        open={modal.open}
        editing={modal.editing}
        prefillUserId={modal.prefillUserId}
        prefillStartDate={modal.prefillStartDate}
        members={members}
        projects={projects}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={closeModal}
      />
    </div>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────────────────

interface AssignmentFormData {
  userId: string;
  projectId?: string;
  title: string;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  note?: string;
}

interface AssignmentModalProps {
  open: boolean;
  editing: Assignment | null;
  prefillUserId?: string;
  prefillStartDate?: string;
  members: WorkspaceMember[];
  projects: Project[];
  onSave: (data: AssignmentFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function AssignmentModal({
  open,
  editing,
  prefillUserId,
  prefillStartDate,
  members,
  projects,
  onSave,
  onDelete,
  onClose,
}: AssignmentModalProps) {
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setUserId(editing.userId);
      setProjectId(editing.projectId ?? "none");
      setTitle(editing.title);
      setStartDate(editing.startDate);
      setEndDate(editing.endDate);
      setEstimatedHours(editing.estimatedHours);
      setNote(editing.note ?? "");
    } else {
      setUserId(prefillUserId ?? (members[0]?.userId ?? ""));
      setProjectId("none");
      setTitle("");
      setStartDate(prefillStartDate ?? format(new Date(), "yyyy-MM-dd"));
      setEndDate(prefillStartDate ?? format(new Date(), "yyyy-MM-dd"));
      setEstimatedHours("");
      setNote("");
    }
  }, [open, editing, prefillUserId, prefillStartDate, members]);

  function handleProjectChange(pid: string) {
    setProjectId(pid);
    if (pid !== "none" && !title) {
      const proj = projects.find((p) => p.id === pid);
      if (proj) setTitle(proj.name);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title || !startDate || !endDate || !estimatedHours) return;
    setSaving(true);
    try {
      await onSave({
        userId,
        projectId: projectId !== "none" ? projectId : undefined,
        title,
        startDate,
        endDate,
        estimatedHours: parseFloat(estimatedHours),
        note: note || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    try {
      await onDelete(editing.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Assignment" : "New Assignment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="userId">Member</Label>
            <Select value={userId} onValueChange={setUserId} disabled={!!editing}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="projectId">Project</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger id="projectId">
                <SelectValue placeholder="No project / Custom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project / Custom</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: p.color ?? "#6366f1" }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedHours">Estimated hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0.5"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 40"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
