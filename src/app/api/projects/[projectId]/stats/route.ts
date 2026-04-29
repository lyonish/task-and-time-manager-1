import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { db } from "@/lib/db";
import { workLogs, tasks, users } from "@/lib/db/schema";
import { eq, and, gte, lt, isNotNull, inArray } from "drizzle-orm";
import type { StatsResponse, StatsDimension } from "@/app/api/workspaces/[workspaceId]/stats/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;
    const project = await ProjectService.getById(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isMember = await WorkspaceService.isMember(project.workspaceId, session.user.id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dimension = (searchParams.get("dimension") ?? "member") as StatsDimension;
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const defaultFrom = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? defaultTo;

    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    const start = new Date(fy, fm - 1, 1);
    const end = new Date(ty, tm, 1);

    const members = await WorkspaceService.getMembers(project.workspaceId);
    const userMap = new Map(
      members.flatMap((m) => m.user ? [[m.user.id, { name: m.user.name, avatarUrl: m.user.avatarUrl }]] : [])
    );

    const projectTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    const taskIds = projectTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      return NextResponse.json({ dimension, from, to, totalSeconds: 0, rows: [] } satisfies StatsResponse);
    }

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
          isNotNull(workLogs.endTime),
          gte(workLogs.startTime, start),
          lt(workLogs.startTime, end),
          inArray(workLogs.taskId, taskIds)
        )
      );

    // Fill in any users not in workspace members (e.g. removed members)
    const missingUserIds = [...new Set(logs.map((l) => l.userId).filter((id) => !userMap.has(id)))];
    if (missingUserIds.length > 0) {
      const extraUsers = await db
        .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.id, missingUserIds));
      for (const u of extraUsers) userMap.set(u.id, { name: u.name, avatarUrl: u.avatarUrl });
    }

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
      if (!log.endTime || !log.taskId) continue;
      const seconds = Math.round((log.endTime.getTime() - log.startTime.getTime()) / 1000);
      if (seconds <= 0) continue;

      const monthKey = log.startTime.toISOString().slice(0, 7);
      const user = userMap.get(log.userId);

      let groupKey: string;
      let groupLabel: string;
      let groupColor: string | null = null;
      let groupAvatarUrl: string | null | undefined;
      let breakdownKey: string;
      let breakdownLabel: string;
      let breakdownColor: string | null = null;

      if (dimension === "member") {
        groupKey = log.userId;
        groupLabel = user?.name ?? log.userId;
        groupAvatarUrl = user?.avatarUrl;
        breakdownKey = monthKey;
        breakdownLabel = new Date(monthKey + "-01").toLocaleDateString("en", { year: "numeric", month: "short" });
      } else {
        // month or project dimension → show by month with member breakdown
        groupKey = monthKey;
        groupLabel = new Date(monthKey + "-01").toLocaleDateString("en", { year: "numeric", month: "short" });
        breakdownKey = log.userId;
        breakdownLabel = user?.name ?? log.userId;
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

    const rows = Array.from(acc.values())
      .sort((a, b) => (dimension === "member" ? b.totalSeconds - a.totalSeconds : a.key.localeCompare(b.key)))
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

    const totalSeconds = rows.reduce((s, r) => s + r.totalSeconds, 0);
    return NextResponse.json({ dimension, from, to, totalSeconds, rows } satisfies StatsResponse);
  } catch (error) {
    console.error("Project stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
