"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AccountSettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const mismatch = next && confirm && next !== confirm;
  const tooShort = next && next.length < 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast.error("Passwords do not match"); return; }
    if (next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Password changed");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account security.</p>
      </div>

      <Separator />

      <div className="space-y-1">
        <h2 className="text-base font-semibold">Change password</h2>
        <p className="text-sm text-muted-foreground">Choose a strong password of at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              className={`pr-9 ${tooShort ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {tooShort && <p className="text-xs text-destructive">At least 8 characters</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={mismatch ? "border-destructive" : ""}
          />
          {mismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
        </div>

        <Button type="submit" disabled={saving || !!mismatch || !!tooShort || !current}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Change password"}
        </Button>
      </form>
    </div>
  );
}
