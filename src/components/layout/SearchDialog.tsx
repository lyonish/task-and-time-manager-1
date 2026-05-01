"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, FolderOpen, CheckSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/app/api/search/route";

type ResultItem =
  | { kind: "project"; id: string; name: string; color: string | null }
  | { kind: "task"; id: string; title: string; projectId: string; projectName: string; projectColor: string | null; statusName: string | null; statusColor: string | null };

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ projects: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems: ResultItem[] = [
    ...results.projects.map((p) => ({ kind: "project" as const, ...p })),
    ...results.tasks.map((t) => ({ kind: "task" as const, ...t })),
  ];

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setCursor(0);
    } else {
      setQuery("");
      setResults({ projects: [], tasks: [] });
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults({ projects: [], tasks: [] }); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setCursor(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  };

  const navigate = useCallback((item: ResultItem) => {
    setOpen(false);
    const projectId = item.kind === "project" ? item.id : item.projectId;
    const suffix = item.kind === "task" ? `?taskId=${item.id}` : "";
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((ws: { id: string }[]) => {
        const wsId = ws[0]?.id;
        if (wsId) router.push(`/workspace/${wsId}/project/${projectId}${suffix}`);
      });
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && allItems[cursor]) {
      navigate(allItems[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasResults = allItems.length > 0;

  const dialog = open
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              {loading
                ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks and projects…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
            </div>

            {/* Results */}
            {query.trim() && (
              <div className="max-h-80 overflow-y-auto py-2">
                {!hasResults && !loading && (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">No results for "{query}"</p>
                )}

                {results.projects.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Projects</p>
                    {results.projects.map((p, i) => {
                      const idx = i;
                      return (
                        <button
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                            cursor === idx && "bg-accent"
                          )}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={() => navigate({ kind: "project", ...p })}
                        >
                          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate font-medium">{p.name}</span>
                          {p.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.tasks.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tasks</p>
                    {results.tasks.map((t, i) => {
                      const idx = results.projects.length + i;
                      return (
                        <button
                          key={t.id}
                          className={cn(
                            "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors",
                            cursor === idx && "bg-accent"
                          )}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={() => navigate({ kind: "task", ...t })}
                        >
                          <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{t.title}</span>
                          <span className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                            {t.projectColor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.projectColor }} />}
                            {t.projectName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer hint */}
            {!query.trim() && (
              <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                Type to search tasks and projects
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 w-full max-w-xs px-4 rounded-full bg-muted text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search tasks, projects…</span>
        <kbd className="hidden sm:inline text-[10px] border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </button>
      {dialog}
    </>
  );
}
