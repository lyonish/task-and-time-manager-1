"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
}

export default function GeneralSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}`)
      .then((r) => r.json())
      .then((data: WorkspaceData) => {
        setWorkspace(data);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setIconUrl(data.iconUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          iconUrl: iconUrl || null,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved." });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error ?? "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!workspace) return <p className="text-muted-foreground">Workspace not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">General</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your organization's basic information.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Organization name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What does your organization do?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="iconUrl">Icon URL</Label>
          <div className="flex items-center gap-3">
            {iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt="icon preview"
                className="h-10 w-10 rounded-md object-cover border border-border"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <Input
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </div>
  );
}
