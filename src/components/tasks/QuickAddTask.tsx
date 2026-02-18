"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickAddTaskProps {
  projectId: string;
  statusId?: string;
}

export function QuickAddTask({ projectId, statusId }: QuickAddTaskProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          statusId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      setTitle("");
      setIsAdding(false);
      router.refresh();
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsAdding(false);
      setTitle("");
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add task...
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsAdding(false);
          }
        }}
        placeholder="Task name"
        disabled={isSubmitting}
        autoFocus
        className="h-8 text-sm"
      />
    </form>
  );
}
