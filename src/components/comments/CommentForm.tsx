"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface CommentFormProps {
  taskId: string;
  members: { id: string; name: string; email: string; avatarUrl: string | null }[];
}

export function CommentForm({ taskId }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || content.trim() === "") return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      setContent("");
      router.refresh();
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Write a comment… (Markdown supported)"
        minHeight="4rem"
        toolbar={false}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Comment
        </Button>
      </div>
    </div>
  );
}
