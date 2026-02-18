"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface CommentFormProps {
  taskId: string;
  members: Member[];
}

export function CommentForm({ taskId, members }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  useEffect(() => {
    if (showMentions) {
      setMentionIndex(0);
    }
  }, [showMentions, mentionSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(value);
    setCursorPosition(cursor);

    // Check for @ mention
    const beforeCursor = value.slice(0, cursor);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const afterAt = beforeCursor.slice(atIndex + 1);
      // Check if there's a space or it's a valid mention search
      if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
        setMentionSearch(afterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
  };

  const insertMention = (member: Member) => {
    const beforeCursor = content.slice(0, cursorPosition);
    const afterCursor = content.slice(cursorPosition);
    const atIndex = beforeCursor.lastIndexOf("@");

    const beforeAt = content.slice(0, atIndex);
    const mention = `@[${member.name}](${member.id}) `;

    setContent(beforeAt + mention + afterCursor);
    setShowMentions(false);
    setMentionSearch("");

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = beforeAt.length + mention.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

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
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... Use @ to mention someone"
        disabled={isSubmitting}
        rows={2}
        className="resize-none pr-12"
      />

      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={isSubmitting || !content.trim()}
        className="absolute bottom-2 right-2 h-8 w-8"
      >
        <Send className="h-4 w-4" />
      </Button>

      {/* Mention dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 w-64 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              onClick={() => insertMention(member)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent flex flex-col",
                index === mentionIndex && "bg-accent"
              )}
            >
              <span className="font-medium">{member.name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
