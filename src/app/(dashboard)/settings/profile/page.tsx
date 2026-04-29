"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarUrl: avatarUrl.trim() || null }),
      });
      if (!res.ok) throw new Error();
      await update({ name: name.trim(), avatarUrl: avatarUrl.trim() || null });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (session?.user?.name ?? name)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your public profile information.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="avatar-url">Avatar URL</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              maxLength={500}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
