import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { db } from "@/lib/db";
import { workLogs, tasks, projects } from "@/lib/db/schema";
import { eq, and, gte, lt, isNotNull, inArray } from "drizzle-orm";

export type StatsDimension = "member" | "project" | "month";

export interface StatsRow {
  key: string;
  label: string;
  color: string | null;
  avatarUrl?: string | null;
  totalSeconds: number;
  taskCount: number;
  breakdown: { key: string; label: string; color: string | null; totalSeconds: number }[];
}

export interface StatsResponse {
  dimension: StatsDimension;
  from: string;
  to: string;
  totalSeconds: number;
  rows: StatsRow[];
}

function parseMonthRange(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, 1);
  const end = new Date(ty, tm, 1); // exclusive
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId } = await params;
    const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dimension = (searchParams.get("dimension") ?? "member") as StatsDimension;
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-based
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const defaultFrom = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const defaultTo = `${curYear}-${String(curMonth).padStart(2, "0")}`;
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? defaultTo;

    const { start, end } = parseMonthRange(from, to);

    // Get all workspace project IDs for scoping
    const workspaceProjects = await db
      .select({ id: projects.id, name: projects.name, color: projects.color })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    const projectIds = workspaceProjects.map((p) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ dimension, from, to, totalSeconds: 0, rows: [] } satisfies StatsResponse);
    }

    // Get all tasks in these projects
    const projectTasks = await db
      .select({ id: tasks.id, projectId: tasks.projectId })
      .from(tasks)
      .where(inArray(tasks.projectId, projectIds));

    const taskIds = projectTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      return NextResponse.json({ dimension, from, to, totalSeconds: 0, rows: [] } satisfies StatsResponse);
    }

    const taskProjectMap = new Map(projectTasks.map((t) => [t.id, t.projectId]));
    const projectMap = new Map(workspaceProjects.map((p) => [p.id, p]));

    // Get workspace members for user info and scoping
    const members = await WorkspaceService.getMembers(workspaceId);
    const userMap = new Map(
      members.flatMap((m) => m.user ? [[m.user.id, { name: m.user.name, avatarUrl: m.user.avatarUrl }]] : [])
    );
    const memberUserIds = [...userMap.keys()];
    if (memberUserIds.length === 0) {
      return NextResponse.json({ dimension, from, to, totalSeconds: 0, rows: [] } satisfies StatsResponse);
    }

    // Fetch completed work logs in date range, scoped to workspace tasks AND workspace members
    const logs = await db
      .select({
        id: workLogs.id,
        userId: workLogs.userId,
        taskId: workLogs.taskId,
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
      })
      .from(workLogs)
      .where(
        and(
          isNotNull(workLogs.startTime),
          isNotNull(workLogs.endTime),
          gte(workLogs.startTime, start),
          lt(workLogs.startTime, end),
          inArray(workLogs.taskId, taskIds),
          inArray(workLogs.userId, memberUserIds)
        )
      );

    const rows = buildRows(logs, dimension, taskProjectMap, projectMap, userMap);

    const totalSeconds = rows.reduce((s, r) => s + r.totalSeconds, 0);
    return NextResponse.json({ dimension, from, to, totalSeconds, rows } satisfies StatsResponse);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type LogRow = { id: string; userId: string; taskId: string | null; startTime: Date | null; endTime: Date | null };

function buildRows(
  logs: LogRow[],
  dimension: StatsDimension,
  taskProjectMap: Map<string, string>,
  projectMap: Map<string, { id: string; name: string; color: string | null }>,
  userMap: Map<string, { name: string; avatarUrl: string | null }>
): StatsRow[] {
  type Accumulator = {
    key: string;
    label: string;
    color: string | null;
    avatarUrl?: string | null;
    totalSeconds: number;
    tasks: Set<string>;
    breakdown: Map<string, { label: string; color: string | null; totalSeconds: number }>;
  };

  const acc = new Map<string, Accumulator>();

  for (const log of logs) {
    if (!log.endTime || !log.startTime || !log.taskId) continue;
    const seconds = Math.round((log.endTime.getTime() - log.startTime.getTime()) / 1000);
    if (seconds <= 0) continue;

    const projectId = taskProjectMap.get(log.taskId);
    if (!projectId) continue;
    const project = projectMap.get(projectId);
    if (!project) continue;

    const monthKey = log.startTime.toISOString().slice(0, 7); // YYYY-MM
    const user = userMap.get(log.userId);

    let groupKey: string;
    let groupLabel: string;
    let groupColor: string | null;
    let groupAvatarUrl: string | null | undefined;
    let breakdownKey: string;
    let breakdownLabel: string;
    let breakdownColor: string | null;

    if (dimension === "member") {
      groupKey = log.userId;
      groupLabel = user?.name ?? log.userId;
      groupColor = null;
      groupAvatarUrl = user?.avatarUrl;
      breakdownKey = projectId;
      breakdownLabel = project.name;
      breakdownColor = project.color;
    } else if (dimension === "project") {
      groupKey = projectId;
      groupLabel = project.name;
      groupColor = project.color;
      breakdownKey = log.userId;
      breakdownLabel = user?.name ?? log.userId;
      breakdownColor = null;
    } else {
      groupKey = monthKey;
      groupLabel = new Date(monthKey + "-01").toLocaleDateString("en", { year: "numeric", month: "short" });
      groupColor = null;
      breakdownKey = projectId;
      breakdownLabel = project.name;
      breakdownColor = project.color;
    }

    if (!acc.has(groupKey)) {
      acc.set(groupKey, { key: groupKey, label: groupLabel, color: groupColor, avatarUrl: groupAvatarUrl, totalSeconds: 0, tasks: new Set(), breakdown: new Map() });
    }
    const entry = acc.get(groupKey)!;
    entry.totalSeconds += seconds;
    if (log.taskId) entry.tasks.add(log.taskId);

    if (!entry.breakdown.has(breakdownKey)) {
      entry.breakdown.set(breakdownKey, { label: breakdownLabel, color: breakdownColor, totalSeconds: 0 });
    }
    entry.breakdown.get(breakdownKey)!.totalSeconds += seconds;
  }

  return Array.from(acc.values())
    .sort((a, b) => dimension === "month" ? a.key.localeCompare(b.key) : b.totalSeconds - a.totalSeconds)
    .map((e) => ({
      key: e.key,
      label: e.label,
      color: e.color ?? null,
      avatarUrl: e.avatarUrl,
      totalSeconds: e.totalSeconds,
      taskCount: e.tasks.size,
      breakdown: Array.from(e.breakdown.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds),
    }));
}
