"use client";

import { Clock, Users, FolderKanban, TrendingUp } from "lucide-react";
import { formatHours } from "./statsUtils";
import type { StatsResponse } from "@/app/api/workspaces/[workspaceId]/stats/route";

interface Props {
  data: StatsResponse;
}

export function StatsSummaryCards({ data }: Props) {
  const totalHours = formatHours(data.totalSeconds);
  const activeCount = data.rows.length;
  const taskCount = data.rows.reduce((s, r) => s + r.taskCount, 0);
  const topRow = data.rows[0];

  const cards = [
    {
      label: "Total logged",
      value: totalHours,
      icon: Clock,
      sub: `across ${data.rows.length} ${data.dimension === "month" ? "months" : data.dimension === "member" ? "members" : "projects"}`,
    },
    {
      label: data.dimension === "member" ? "Active members" : data.dimension === "project" ? "Active projects" : "Months",
      value: String(activeCount),
      icon: data.dimension === "member" ? Users : data.dimension === "project" ? FolderKanban : TrendingUp,
      sub: "with logged time",
    },
    {
      label: "Tasks logged",
      value: String(taskCount),
      icon: TrendingUp,
      sub: "unique tasks",
    },
    {
      label: "Most active",
      value: topRow?.label ?? "—",
      icon: TrendingUp,
      sub: topRow ? formatHours(topRow.totalSeconds) : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <card.icon className="h-3.5 w-3.5" />
            {card.label}
          </div>
          <p className="text-2xl font-bold truncate">{card.value}</p>
          {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
