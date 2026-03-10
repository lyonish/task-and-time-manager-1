"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, UserPlus } from "lucide-react";

type Role = "Admin" | "Member" | "Guest";

interface Member {
  id: string;
  userId: string;
  role: Role;
  isOwner: boolean;
  joinedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Guest: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function RoleBadge({ role, isOwner }: { role: Role; isOwner: boolean }) {
  const label = isOwner ? "Owner" : role;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[label]}`}>
      {label}
    </span>
  );
}

export default function MembersSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`);
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        await loadMembers();
      } else {
        const err = await res.json();
        setInviteError(err.error ?? "Failed to add member.");
      }
    } catch {
      setInviteError("Something went wrong.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await loadMembers();
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
    await loadMembers();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage who has access to this workspace.
        </p>
      </div>

      {/* Invite form */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-sm">Invite a member</h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="invite-email" className="sr-only">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Member">Member</SelectItem>
              <SelectItem value="Guest">Guest</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            <span className="ml-2">Add</span>
          </Button>
        </form>
        {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium overflow-hidden">
                {m.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user.avatarUrl} alt={m.user.name} className="h-full w-full object-cover" />
                ) : (
                  m.user.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>

              {/* Role */}
              {m.isOwner ? (
                <RoleBadge role={m.role} isOwner={true} />
              ) : (
                <Select
                  value={m.role}
                  onValueChange={(v) => handleRoleChange(m.userId, v as Role)}
                >
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Remove */}
              {!m.isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(m.userId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
