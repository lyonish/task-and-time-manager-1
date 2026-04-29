"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StatsBarChart } from "./StatsBarChart";
import { StatsTable } from "./StatsTable";
import { StatsSummaryCards } from "./StatsSummaryCards";
import { cn } from "@/lib/utils";
import type { StatsResponse, StatsDimension } from "@/app/api/workspaces/[workspaceId]/stats/route";

interface Props {
  projectId: string;
}

const DIMENSIONS: { value: StatsDimension; label: string }[] = [
  { value: "member", label: "By Member" },
  { value: "month",  label: "By Month" },
];

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function threeMonthsAgoYM() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ProjectStatsPanel({ projectId }: Props) {
  const [dimension, setDimension] = useState<StatsDimension>("member");
  const [from, setFrom] = useState(threeMonthsAgoYM());
  const [to, setTo] = useState(currentYM());
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stats?dimension=${dimension}&from=${from}&to=${to}`
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId, dimension, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Dimension tabs */}
        <div className="flex gap-1">
          {DIMENSIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDimension(d.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                dimension === d.value
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 text-sm">
          <input
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-background text-sm"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="month"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : data ? (
        <div className="space-y-5">
          <StatsSummaryCards data={data} />
          <StatsBarChart data={data} />
          <StatsTable data={data} />
        </div>
      ) : null}
    </div>
  );
}
