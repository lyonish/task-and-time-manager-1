"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatHours, keyColor } from "./statsUtils";
import type { StatsResponse } from "@/app/api/workspaces/[workspaceId]/stats/route";

interface Props {
  data: StatsResponse;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover shadow-md px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-muted-foreground">{formatHours(payload[0].value)}</p>
    </div>
  );
}

export function StatsBarChart({ data }: Props) {
  const chartData = data.rows.map((r) => ({
    name: r.label,
    seconds: r.totalSeconds,
    color: r.color ?? keyColor(r.key),
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatHours(v)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.06)" }} />
          <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
