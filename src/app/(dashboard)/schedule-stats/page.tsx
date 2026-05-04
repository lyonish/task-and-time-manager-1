"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  format,
  addWeeks, subWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, ArrowLeft, MessageCircle,
  Pencil, Trash2, Check, X, Loader2, ChevronDown, Users, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectStat {
  projectId: string | null;
  projectName: string;
  projectColor: string;
  minutes: number;
}

interface ActionStat {
  actionType: string | null;
  minutes: number;
}

interface PersonalStats {
  totalMinutes: number;
  byProject: ProjectStat[];
  byAction: ActionStat[];
}

interface MatrixRow {
  taskId: string | null;
  taskTitle: string;
  projectId: string | null;
  projectName: string;
  projectColor: string;
  byAction: Record<string, number>;
  totalMinutes: number;
}

interface StatsResponse {
  period: { start: string; end: string; type: string };
  stats: PersonalStats;
  matrix: MatrixRow[];
  actionTypes: string[];
}

interface CommentRow {
  id: string;
  authorId: string;
  revieweeId: string;
  periodType: string;
  taskId: string | null;
  actionType: string | null;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface TeamMember {
  user: { id: string; name: string; avatarUrl: string | null };
  totalMinutes: number;
  byProject: ProjectStat[];
  byAction: ActionStat[];
}

interface GroupInfo {
  id: string;
  name: string;
  isDefault: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMins(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function getPeriodBounds(pivot: Date, type: "week" | "month"): { start: Date; end: Date } {
  if (type === "week") {
    return {
      start: startOfWeek(pivot, { weekStartsOn: 1 }),
      end: endOfWeek(pivot, { weekStartsOn: 1 }),
    };
  }
  return { start: startOfMonth(pivot), end: endOfMonth(pivot) };
}

function shiftPivot(pivot: Date, type: "week" | "month", dir: -1 | 1): Date {
  if (type === "week") return dir === -1 ? subWeeks(pivot, 1) : addWeeks(pivot, 1);
  return dir === -1 ? subMonths(pivot, 1) : addMonths(pivot, 1);
}

function formatPeriodLabel(start: Date, end: Date, type: "week" | "month"): string {
  if (type === "month") return format(start, "MMMM yyyy");
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameYear && sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return format(d, "MMM d");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", cls)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground shrink-0",
        cls
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

interface BarItem {
  label: string;
  minutes: number;
  color: string;
}

function HBarChart({ items }: { items: BarItem[] }) {
  if (items.length === 0) return null;
  const height = items.length * 28 + 16;
  const maxMins = Math.max(...items.map((i) => i.minutes));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={items}
        margin={{ top: 2, right: 52, bottom: 2, left: 0 }}
      >
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <XAxis type="number" hide domain={[0, maxMins * 1.15]} />
        <Bar dataKey="minutes" radius={[0, 3, 3, 0]} barSize={14}>
          {items.map((item, idx) => (
            <Cell key={idx} fill={item.color} />
          ))}
          <LabelList
            dataKey="minutes"
            position="right"
            formatter={(v: unknown) => fmtMins(Number(v))}
            style={{ fontSize: 11, fill: "#6b7280" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Period column ────────────────────────────────────────────────────────────

function PeriodCol({
  label,
  stats,
  loading,
}: {
  label: string;
  stats: PersonalStats | null;
  loading: boolean;
}) {
  const projectItems: BarItem[] = (stats?.byProject ?? []).map((p) => ({
    label: p.projectName.length > 14 ? p.projectName.slice(0, 13) + "…" : p.projectName,
    minutes: p.minutes,
    color: p.projectColor,
  }));

  const actionItems: BarItem[] = (stats?.byAction ?? [])
    .filter((a) => a.actionType != null)
    .map((a) => ({
      label: a.actionType!,
      minutes: a.minutes,
      color: "#6366f1",
    }));

  return (
    <div className="flex-1 min-w-0 border rounded-lg p-4 bg-card">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate mr-2">
          {label}
        </span>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <span className="text-2xl font-bold shrink-0">
            {stats ? fmtMins(stats.totalMinutes) : "–"}
          </span>
        )}
      </div>

      {!loading && stats && stats.totalMinutes > 0 && (
        <>
          {projectItems.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                By Project
              </p>
              <HBarChart items={projectItems} />
            </div>
          )}
          {actionItems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                By Action
              </p>
              <HBarChart items={actionItems} />
            </div>
          )}
        </>
      )}

      {!loading && (!stats || stats.totalMinutes === 0) && (
        <p className="text-xs text-muted-foreground">No logged work.</p>
      )}
    </div>
  );
}

// ─── Comment thread ───────────────────────────────────────────────────────────

function CommentThread({
  comments,
  revieweeId,
  periodType,
  periodStart,
  periodEnd,
  taskId,
  currentUserId,
  onRefresh,
}: {
  comments: CommentRow[];
  revieweeId: string;
  periodType: "week" | "month";
  periodStart: string;
  periodEnd: string;
  taskId: string | null;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function submit() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await fetch("/api/review-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revieweeId,
          periodType,
          periodStart,
          periodEnd,
          taskId,
          actionType: null,
          content: trimmed,
        }),
      });
      setNewText("");
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    await fetch(`/api/review-comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    setEditId(null);
    onRefresh();
  }

  async function deleteComment(id: string) {
    await fetch(`/api/review-comments/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="px-4 py-3 bg-muted/20 border-t">
      {comments.length > 0 && (
        <div className="space-y-3 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.author.name} avatarUrl={c.author.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{c.author.name}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
                  {c.authorId === currentUserId && editId !== c.id && (
                    <div className="ml-auto flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditId(c.id);
                          setEditText(c.content);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {editId === c.id ? (
                  <div className="mt-1 flex gap-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1 resize-none bg-background"
                      rows={2}
                    />
                    <button
                      onClick={() => saveEdit(c.id)}
                      className="text-green-600 hover:text-green-700 shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a comment… (Cmd+Enter to send)"
          className="flex-1 text-xs border rounded px-2 py-1.5 resize-none bg-background"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={submitting || !newText.trim()}
          className="shrink-0"
        >
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
        </Button>
      </div>
    </div>
  );
}

// ─── Matrix table ─────────────────────────────────────────────────────────────

function MatrixTable({
  rows,
  actionTypes,
  comments,
  revieweeId,
  periodType,
  periodStart,
  periodEnd,
  currentUserId,
  onRefresh,
}: {
  rows: MatrixRow[];
  actionTypes: string[];
  comments: CommentRow[];
  revieweeId: string;
  periodType: "week" | "month";
  periodStart: string;
  periodEnd: string;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const commentedTaskIds = useMemo(
    () => new Set(comments.filter((c) => c.taskId != null).map((c) => c.taskId!)),
    [comments]
  );
  const commentedNullTask = useMemo(
    () => comments.some((c) => c.taskId == null),
    [comments]
  );

  const hasNone = rows.some((r) => (r.byAction["__none__"] ?? 0) > 0);
  const columns = [...actionTypes, ...(hasNone ? ["__none__"] : [])];

  function rowKey(r: MatrixRow) {
    return r.taskId ?? "__notask__";
  }

  function isCommented(r: MatrixRow) {
    return r.taskId ? commentedTaskIds.has(r.taskId) : commentedNullTask;
  }

  function rowComments(r: MatrixRow) {
    return comments.filter((c) => c.taskId === r.taskId);
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No work logged this period.
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[200px]">
              Task
            </th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[130px]">
              Project
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="text-right px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap"
              >
                {col === "__none__" ? "—" : col}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Total</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isExpanded = expanded.has(key);
            const commented = isCommented(row);
            const rc = rowComments(row);

            return (
              <React.Fragment key={key}>
                <tr
                  className={cn(
                    "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                    commented && "border-l-2 border-l-red-500"
                  )}
                  onClick={() => toggle(key)}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="block truncate max-w-[190px]">{row.taskTitle}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 max-w-[120px]">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.projectColor }}
                      />
                      <span className="truncate text-muted-foreground">{row.projectName}</span>
                    </div>
                  </td>
                  {columns.map((col) => {
                    const mins = row.byAction[col] ?? 0;
                    return (
                      <td key={col} className="px-3 py-2 text-right tabular-nums">
                        {mins > 0 ? fmtMins(mins) : <span className="text-muted-foreground/40">–</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {fmtMins(row.totalMinutes)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {commented && (
                        <MessageCircle className="w-3 h-3 text-red-500 shrink-0" />
                      )}
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={columns.length + 4} className="p-0">
                      <CommentThread
                        comments={rc}
                        revieweeId={revieweeId}
                        periodType={periodType}
                        periodStart={periodStart}
                        periodEnd={periodEnd}
                        taskId={row.taskId}
                        currentUserId={currentUserId}
                        onRefresh={onRefresh}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Group selector ───────────────────────────────────────────────────────────

function GroupSelector({
  groups,
  selectedId,
  onChange,
}: {
  groups: GroupInfo[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });

  const selected = groups.find((g) => g.id === selectedId);

  function openMenu() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
    }
    setOpen(true);
  }

  if (groups.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/50 bg-background"
      >
        <span>{selected?.name ?? "Select group"}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 bg-popover border rounded-md shadow-md py-1 text-sm"
              style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth }}
            >
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={cn(
                    "w-full text-left px-3 py-1.5 hover:bg-muted",
                    g.id === selectedId && "font-medium text-primary"
                  )}
                  onClick={() => {
                    onChange(g.id);
                    setOpen(false);
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab({
  workspaceId,
  pivot,
  periodType,
}: {
  workspaceId: string;
  pivot: Date;
  periodType: "week" | "month";
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/groups`)
      .then((r) => r.json())
      .then((data: GroupInfo[]) => {
        const nonDefault = (data ?? []).filter((g) => !g.isDefault);
        setGroups(nonDefault);
        if (nonDefault.length > 0) setSelectedGroupId(nonDefault[0].id);
      });
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoading(true);
    const dateStr = format(pivot, "yyyy-MM-dd");
    fetch(
      `/api/workspaces/${workspaceId}/schedule-stats?date=${dateStr}&period=${periodType}&groupId=${selectedGroupId}`
    )
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .finally(() => setLoading(false));
  }, [workspaceId, selectedGroupId, pivot, periodType]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No groups to display. Create a group and assign members as a leader.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <GroupSelector
          groups={groups}
          selectedId={selectedGroupId}
          onChange={setSelectedGroupId}
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Member</th>
              <th className="text-right px-4 py-2 font-semibold text-muted-foreground">
                Total Hours
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {!loading && members.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No data for this period.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr
                key={m.user.id}
                className="border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => router.push(`/schedule-stats?userId=${m.user.id}`)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                    <span className="font-medium">{m.user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {fmtMins(m.totalMinutes)}
                </td>
                <td className="px-4 py-2.5">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ScheduleStatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetUserIdParam = searchParams.get("userId");

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [targetUserName, setTargetUserName] = useState("");

  const [activeTab, setActiveTab] = useState<"mine" | "team">("mine");
  const [periodType, setPeriodType] = useState<"week" | "month">("week");
  const [pivot, setPivot] = useState(() => new Date());

  const [currStats, setCurrStats] = useState<PersonalStats | null>(null);
  const [prevStats, setPrevStats] = useState<PersonalStats | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const isViewingOther =
    !!targetUserIdParam && !!currentUserId && targetUserIdParam !== currentUserId;
  const targetUserId = targetUserIdParam || currentUserId;

  const { start: currStart, end: currEnd } = useMemo(
    () => getPeriodBounds(pivot, periodType),
    [pivot, periodType]
  );
  const { start: prevStart, end: prevEnd } = useMemo(
    () => getPeriodBounds(shiftPivot(pivot, periodType, -1), periodType),
    [pivot, periodType]
  );

  // Bootstrap: current user + workspace
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me: { id: string; name: string }) => {
        if (me?.id) {
          setCurrentUserId(me.id);
          setCurrentUserName(me.name ?? "");
        }
      });

    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((ws: { id: string }[]) => {
        if (ws?.[0]?.id) setWorkspaceId(ws[0].id);
      });
  }, []);

  // Check leader status once workspace + user are known
  useEffect(() => {
    if (!workspaceId || !currentUserId) return;
    const dateStr = format(new Date(), "yyyy-MM-dd");
    fetch(`/api/workspaces/${workspaceId}/schedule-stats?date=${dateStr}&period=week`)
      .then((r) => r.json())
      .then((data) => setIsLeader((data.members?.length ?? 0) > 0))
      .catch(() => setIsLeader(false));
  }, [workspaceId, currentUserId]);

  // Resolve target user's name when viewing another user
  useEffect(() => {
    if (!isViewingOther || !workspaceId || !targetUserIdParam) {
      setTargetUserName("");
      return;
    }
    const dateStr = format(pivot, "yyyy-MM-dd");
    fetch(
      `/api/workspaces/${workspaceId}/schedule-stats?date=${dateStr}&period=${periodType}`
    )
      .then((r) => r.json())
      .then((data: { members?: TeamMember[] }) => {
        const found = data.members?.find((m) => m.user.id === targetUserIdParam);
        if (found) setTargetUserName(found.user.name);
      })
      .catch(() => {});
  }, [isViewingOther, workspaceId, targetUserIdParam, pivot, periodType]);

  // Fetch personal stats
  const fetchStats = useCallback(async () => {
    if (!targetUserId) return;
    setStatsLoading(true);
    try {
      const currDate = format(pivot, "yyyy-MM-dd");
      const prevDate = format(shiftPivot(pivot, periodType, -1), "yyyy-MM-dd");
      const userSuffix =
        targetUserIdParam && targetUserIdParam !== currentUserId
          ? `&userId=${targetUserIdParam}`
          : "";

      const [currRes, prevRes] = await Promise.all([
        fetch(`/api/schedule-stats?date=${currDate}&period=${periodType}${userSuffix}`),
        fetch(`/api/schedule-stats?date=${prevDate}&period=${periodType}${userSuffix}`),
      ]);

      const [curr, prev]: [StatsResponse, StatsResponse] = await Promise.all([
        currRes.json(),
        prevRes.json(),
      ]);

      setCurrStats(curr.stats ?? null);
      setPrevStats(prev.stats ?? null);
      setMatrix(curr.matrix ?? []);
      setActionTypes(curr.actionTypes ?? []);
    } finally {
      setStatsLoading(false);
    }
  }, [targetUserId, targetUserIdParam, currentUserId, pivot, periodType]);

  // Fetch comments for current period
  const fetchComments = useCallback(async () => {
    if (!targetUserId) return;
    const params = new URLSearchParams({
      revieweeId: targetUserId,
      periodType,
      periodStart: currStart.toISOString(),
      periodEnd: currEnd.toISOString(),
    });
    const res = await fetch(`/api/review-comments?${params}`);
    if (res.ok) setComments(await res.json());
  }, [targetUserId, periodType, currStart, currEnd]);

  useEffect(() => {
    if (targetUserId) fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (targetUserId) fetchComments();
  }, [fetchComments]);

  const currLabel = formatPeriodLabel(currStart, currEnd, periodType);
  const prevLabel = formatPeriodLabel(prevStart, prevEnd, periodType);

  const pageTitle = isViewingOther
    ? `${targetUserName || "Member"}'s Stats`
    : "Schedule Stats";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {isViewingOther && (
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Tab bar — only show when not viewing another user */}
        {!isViewingOther && (
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => setActiveTab("mine")}
              className={cn(
                "px-4 py-1.5 flex items-center gap-1.5 transition-colors",
                activeTab === "mine"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <User className="w-3.5 h-3.5" />
              My Stats
            </button>
            {isLeader && (
              <button
                onClick={() => setActiveTab("team")}
                className={cn(
                  "px-4 py-1.5 flex items-center gap-1.5 border-l transition-colors",
                  activeTab === "team"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Team
              </button>
            )}
          </div>
        )}

        {/* Period type + navigation */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => setPeriodType("week")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                periodType === "week"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setPeriodType("month")}
              className={cn(
                "px-3 py-1.5 border-l transition-colors",
                periodType === "month"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              Month
            </button>
          </div>

          <button
            onClick={() => setPivot((p) => shiftPivot(p, periodType, -1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[170px] text-center select-none">
            {currLabel}
          </span>
          <button
            onClick={() => setPivot((p) => shiftPivot(p, periodType, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Team tab */}
      {!isViewingOther && activeTab === "team" && workspaceId && (
        <TeamTab workspaceId={workspaceId} pivot={pivot} periodType={periodType} />
      )}

      {/* My stats / member stats */}
      {(isViewingOther || activeTab === "mine") && (
        <>
          {/* Two-column period comparison */}
          <div className="flex gap-4 mb-6">
            <PeriodCol label={prevLabel} stats={prevStats} loading={statsLoading} />
            <PeriodCol label={currLabel} stats={currStats} loading={statsLoading} />
          </div>

          {/* Matrix */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Work Log — {currLabel}
            </h2>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MatrixTable
                rows={matrix}
                actionTypes={actionTypes}
                comments={comments}
                revieweeId={targetUserId}
                periodType={periodType}
                periodStart={currStart.toISOString()}
                periodEnd={currEnd.toISOString()}
                currentUserId={currentUserId}
                onRefresh={fetchComments}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduleStatsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ScheduleStatsContent />
    </Suspense>
  );
}
