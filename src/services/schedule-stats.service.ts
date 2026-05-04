import { db } from "@/lib/db";
import { workLogs, tasks, projects } from "@/lib/db/schema";
import { eq, and, gte, lt, isNotNull, inArray } from "drizzle-orm";

export interface MatrixRow {
  taskId: string | null;
  taskTitle: string;
  projectId: string | null;
  projectName: string;
  projectColor: string;
  // key = actionType (or "__none__" for null)
  byAction: Record<string, number>; // minutes
  totalMinutes: number;
}

export interface ProjectStat {
  projectId: string | null;
  projectName: string;
  projectColor: string;
  minutes: number;
}

export interface ActionStat {
  actionType: string | null;
  minutes: number;
}

export interface PersonalStats {
  totalMinutes: number;
  byProject: ProjectStat[];
  byAction: ActionStat[];
}

export type TeamStats = Map<string, PersonalStats>;

export function getPeriodBounds(date: Date, type: "week" | "month"): { start: Date; end: Date } {
  if (type === "week") {
    // ISO week: Monday–Sunday
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...6=Sat
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  } else {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
}

async function computeStats(userId: string, start: Date, end: Date): Promise<PersonalStats> {
  // Query work logs for the user within the period where startTime AND endTime are set
  const rows = await db
    .select({
      startTime: workLogs.startTime,
      endTime: workLogs.endTime,
      actionType: workLogs.actionType,
      taskId: workLogs.taskId,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(workLogs)
    .leftJoin(tasks, eq(workLogs.taskId, tasks.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(workLogs.userId, userId),
        isNotNull(workLogs.startTime),
        isNotNull(workLogs.endTime),
        gte(workLogs.startTime, start),
        lt(workLogs.startTime, new Date(end.getTime() + 1))
      )
    );

  let totalMinutes = 0;
  const projectMap = new Map<string, ProjectStat>();
  const actionMap = new Map<string | null, ActionStat>();

  for (const row of rows) {
    if (!row.startTime || !row.endTime) continue;
    const mins = Math.max(0, Math.floor((row.endTime.getTime() - row.startTime.getTime()) / 60_000));
    totalMinutes += mins;

    // By project
    const pKey = row.projectId ?? "__none__";
    if (!projectMap.has(pKey)) {
      projectMap.set(pKey, {
        projectId: row.projectId ?? null,
        projectName: row.projectName ?? "No Project",
        projectColor: row.projectColor ?? "#9ca3af",
        minutes: 0,
      });
    }
    projectMap.get(pKey)!.minutes += mins;

    // By action
    const aKey = row.actionType ?? null;
    if (!actionMap.has(aKey)) {
      actionMap.set(aKey, { actionType: aKey, minutes: 0 });
    }
    actionMap.get(aKey)!.minutes += mins;
  }

  return {
    totalMinutes,
    byProject: Array.from(projectMap.values()).sort((a, b) => b.minutes - a.minutes),
    byAction: Array.from(actionMap.values()).sort((a, b) => b.minutes - a.minutes),
  };
}

export class ScheduleStatsService {
  static async getPersonalStats(userId: string, start: Date, end: Date): Promise<PersonalStats> {
    return computeStats(userId, start, end);
  }

  static async getMatrix(
    userId: string,
    start: Date,
    end: Date
  ): Promise<{ rows: MatrixRow[]; actionTypes: string[] }> {
    const rows = await db
      .select({
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
        actionType: workLogs.actionType,
        taskId: workLogs.taskId,
        taskTitle: tasks.title,
        projectId: tasks.projectId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(workLogs)
      .leftJoin(tasks, eq(workLogs.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(workLogs.userId, userId),
          isNotNull(workLogs.startTime),
          isNotNull(workLogs.endTime),
          gte(workLogs.startTime, start),
          lt(workLogs.startTime, new Date(end.getTime() + 1))
        )
      );

    // rowKey = taskId ?? "__notask__"
    const matrixMap = new Map<string, MatrixRow>();
    const actionTypeSet = new Set<string>();

    for (const row of rows) {
      if (!row.startTime || !row.endTime) continue;
      const mins = Math.max(0, Math.floor((row.endTime.getTime() - row.startTime.getTime()) / 60_000));
      const actionKey = row.actionType ?? "__none__";
      if (row.actionType) actionTypeSet.add(row.actionType);

      const rowKey = row.taskId ?? "__notask__";
      if (!matrixMap.has(rowKey)) {
        matrixMap.set(rowKey, {
          taskId: row.taskId ?? null,
          taskTitle: row.taskTitle ?? "No task",
          projectId: row.projectId ?? null,
          projectName: row.projectName ?? "No Project",
          projectColor: row.projectColor ?? "#9ca3af",
          byAction: {},
          totalMinutes: 0,
        });
      }
      const entry = matrixMap.get(rowKey)!;
      entry.byAction[actionKey] = (entry.byAction[actionKey] ?? 0) + mins;
      entry.totalMinutes += mins;
    }

    const actionTypes = Array.from(actionTypeSet).sort();
    const matrixRows = Array.from(matrixMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);

    return { rows: matrixRows, actionTypes };
  }

  static async getTeamStats(memberUserIds: string[], start: Date, end: Date): Promise<TeamStats> {
    const map: TeamStats = new Map();
    if (memberUserIds.length === 0) return map;

    // Batch query all members at once
    const rows = await db
      .select({
        userId: workLogs.userId,
        startTime: workLogs.startTime,
        endTime: workLogs.endTime,
        actionType: workLogs.actionType,
        taskId: workLogs.taskId,
        projectId: tasks.projectId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(workLogs)
      .leftJoin(tasks, eq(workLogs.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          inArray(workLogs.userId, memberUserIds),
          isNotNull(workLogs.startTime),
          isNotNull(workLogs.endTime),
          gte(workLogs.startTime, start),
          lt(workLogs.startTime, new Date(end.getTime() + 1))
        )
      );

    // Initialize all members
    for (const uid of memberUserIds) {
      map.set(uid, { totalMinutes: 0, byProject: [], byAction: [] });
    }

    // Accumulate per-user stats
    type UserAccumulator = {
      totalMinutes: number;
      projectMap: Map<string, ProjectStat>;
      actionMap: Map<string | null, ActionStat>;
    };
    const accumulators = new Map<string, UserAccumulator>();
    for (const uid of memberUserIds) {
      accumulators.set(uid, { totalMinutes: 0, projectMap: new Map(), actionMap: new Map() });
    }

    for (const row of rows) {
      if (!row.startTime || !row.endTime) continue;
      const acc = accumulators.get(row.userId);
      if (!acc) continue;

      const mins = Math.max(0, Math.floor((row.endTime.getTime() - row.startTime.getTime()) / 60_000));
      acc.totalMinutes += mins;

      const pKey = row.projectId ?? "__none__";
      if (!acc.projectMap.has(pKey)) {
        acc.projectMap.set(pKey, {
          projectId: row.projectId ?? null,
          projectName: row.projectName ?? "No Project",
          projectColor: row.projectColor ?? "#9ca3af",
          minutes: 0,
        });
      }
      acc.projectMap.get(pKey)!.minutes += mins;

      const aKey = row.actionType ?? null;
      if (!acc.actionMap.has(aKey)) {
        acc.actionMap.set(aKey, { actionType: aKey, minutes: 0 });
      }
      acc.actionMap.get(aKey)!.minutes += mins;
    }

    for (const [uid, acc] of accumulators) {
      map.set(uid, {
        totalMinutes: acc.totalMinutes,
        byProject: Array.from(acc.projectMap.values()).sort((a, b) => b.minutes - a.minutes),
        byAction: Array.from(acc.actionMap.values()).sort((a, b) => b.minutes - a.minutes),
      });
    }

    return map;
  }
}
