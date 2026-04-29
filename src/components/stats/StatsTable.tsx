"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatHours, keyColor } from "./statsUtils";
import type { StatsResponse } from "@/app/api/workspaces/[workspaceId]/stats/route";

interface Props {
  data: StatsResponse;
}

export function StatsTable({ data }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const maxSeconds = Math.max(...data.rows.map((r) => r.totalSeconds), 1);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">Hours</th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-16">Tasks</th>
            <th className="px-4 py-2.5 w-40 hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const isOpen = expanded.has(row.key);
            const color = row.color ?? keyColor(row.key);
            const pct = (row.totalSeconds / maxSeconds) * 100;

            return (
              <>
                <tr
                  key={row.key}
                  className="border-b border-border hover:bg-accent/40 transition-colors cursor-pointer"
                  onClick={() => toggle(row.key)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      {row.avatarUrl !== undefined ? (
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback
                            className="text-xs text-white"
                            style={{ backgroundColor: color }}
                          >
                            {row.label.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      <span className="font-medium truncate">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.totalSeconds)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.taskCount}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </td>
                </tr>
                {isOpen &&
                  row.breakdown.map((b) => (
                    <tr key={b.key} className="border-b border-border bg-muted/20">
                      <td className="px-4 py-2 pl-14">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: b.color ?? keyColor(b.key) }}
                          />
                          <span className="text-xs">{b.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">
                        {formatHours(b.totalSeconds)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  ))}
              </>
            );
          })}
          {data.rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                No work logs found for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
