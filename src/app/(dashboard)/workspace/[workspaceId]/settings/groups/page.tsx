"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronRight, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceRole } from "@/components/settings/WorkspaceRoleContext";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: "Leader" | "Member";
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface Group {
  id: string;
  name: string;
  isDefault: boolean | null;
  members: GroupMember[];
}

interface WorkspaceMember {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export default function GroupsSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { canEdit } = useWorkspaceRole();
  const { t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [wsMembers, setWsMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create group dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState<Group | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Add member to group
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, membersRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/groups`),
        fetch(`/api/workspaces/${workspaceId}/members`),
      ]);
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (membersRes.ok) setWsMembers(await membersRes.json());
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createGroup = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const group = await res.json();
      setGroups((prev) => [...prev, group]);
      setCreateOpen(false);
      setCreateName("");
      toast.success("Group created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const renameGroup = async () => {
    if (!renamingGroup || !renameValue.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/groups/${renamingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setGroups((prev) => prev.map((g) => g.id === renamingGroup.id ? { ...g, name: renameValue.trim() } : g));
      setRenameOpen(false);
      toast.success("Group renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename group");
    }
  };

  const deleteGroup = async (group: Group) => {
    if (!confirm(t.settings.groups.deleteConfirm(group.name))) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/groups/${group.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      toast.success("Group deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete group");
    }
  };

  const addMember = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAddingToGroup(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  const setMemberRole = async (groupId: string, userId: string, role: "Leader" | "Member") => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, members: g.members.map((m) => m.userId === userId ? { ...m, role } : m) }
            : g
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const removeMember = async (group: Group, userId: string) => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/groups/${group.id}/members?userId=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.settings.groups.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.settings.groups.subtitle}</p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />{t.settings.groups.newGroup}
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = expanded.has(group.id);
          const memberIds = new Set(group.members.map((m) => m.userId));
          const addable = wsMembers.filter((m) => !memberIds.has(m.user.id));

          return (
            <div key={group.id} className="rounded-lg border border-border overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => toggleExpand(group.id)}
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium flex-1">{group.name}</span>
                {group.isDefault && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t.settings.groups.default}</span>
                )}
                <span className="text-xs text-muted-foreground">{group.members.length} member{group.members.length !== 1 ? "s" : ""}</span>

                {canEdit && !group.isDefault && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setRenamingGroup(group); setRenameValue(group.name); setRenameOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteGroup(group)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Member list */}
              {isOpen && (
                <div className="border-t border-border bg-muted/20 divide-y divide-border">
                  {group.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                      </div>
                      {!group.isDefault && (
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border font-medium",
                            m.role === "Leader"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                              : "bg-muted text-muted-foreground border-transparent"
                          )}
                        >
                          {m.role === "Leader" ? "Leader" : "Member"}
                        </span>
                      )}
                      {canEdit && !group.isDefault && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() =>
                              setMemberRole(group.id, m.userId, m.role === "Leader" ? "Member" : "Leader")
                            }
                          >
                            {m.role === "Leader" ? "Demote" : "Make Leader"}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                            onClick={() => removeMember(group, m.userId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add member row */}
                  {canEdit && !group.isDefault && addable.length > 0 && (
                    <div className="px-4 py-2.5">
                      {addingToGroup === group.id ? (
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {addable.map((m) => (
                            <button
                              key={m.user.id}
                              onClick={() => addMember(group.id, m.user.id)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{m.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{m.user.name}</span>
                              <span className="text-xs text-muted-foreground truncate">{m.user.email}</span>
                            </button>
                          ))}
                          <Button variant="ghost" size="sm" className="mt-1" onClick={() => setAddingToGroup(null)}>
                            {t.common.cancel}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingToGroup(group.id)}>
                          <Plus className="h-3 w-3 mr-1" /> {t.settings.groups.addMember}
                        </Button>
                      )}
                    </div>
                  )}

                  {group.members.length === 0 && !group.isDefault && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">{t.settings.groups.noMembers}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create group dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t.settings.groups.newGroup}</DialogTitle></DialogHeader>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={t.settings.groups.namePlaceholder}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={createGroup} disabled={creating || !createName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t.common.rename}</DialogTitle></DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && renameGroup()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={renameGroup} disabled={!renameValue.trim()}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
