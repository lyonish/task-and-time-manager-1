"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StatsSummaryCards } from "./StatsSummaryCards";
import { StatsBarChart } from "./StatsBarChart";
import { StatsTable } from "./StatsTable";
import { cn } from "@/lib/utils";
import type { StatsResponse, StatsDimension } from "@/app/api/workspaces/[workspaceId]/stats/route";

interface Props {
  workspaceId: string;
}

const DIMENSIONS: { value: StatsDimension; label: string }[] = [
  { value: "member",  label: "By Member" },
  { value: "project", label: "By Project" },
  { value: "month",   label: "By Month" },
];

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function threeMonthsAgoYM() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function WorkspaceStatsPage({ workspaceId }: Props) {
  const [dimension, setDimension] = useState<StatsDimension>("member");
  const [from, setFrom] = useState(threeMonthsAgoYM());
  const [to, setTo] = useState(currentYM());
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/stats?dimension=${dimension}&from=${from}&to=${to}`
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [workspaceId, dimension, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Statistics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Work log analytics across the workspace.</p>
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

      {/* Dimension tabs */}
      <div className="flex gap-1 border-b border-border">
        {DIMENSIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => setDimension(d.value)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              dimension === d.value
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : data ? (
        <div className="space-y-6">
          <StatsSummaryCards data={data} />
          <StatsBarChart data={data} />
          <StatsTable data={data} />
        </div>
      ) : null}
    </div>
  );
}
