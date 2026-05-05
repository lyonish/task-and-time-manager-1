"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, MessageSquare, UserPlus, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type NotifType = "comment_added" | "task_assigned" | "mention";

interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  body: string | null;
  taskId: string | null;
  projectId: string | null;
  isRead: boolean | null;
  createdAt: string | null;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
}

const typeIcon: Record<NotifType, React.ReactNode> = {
  comment_added: <MessageSquare className="h-3.5 w-3.5" />,
  task_assigned: <UserPlus className="h-3.5 w-3.5" />,
  mention: <AtSign className="h-3.5 w-3.5" />,
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.taskId && n.projectId) {
      router.push(`/workspace/${n.projectId.slice(0, 0)}` + `/project/${n.projectId}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground/70">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full flex gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border last:border-0",
                  !n.isRead && "bg-primary/5"
                )}
              >
                <div className="relative shrink-0 mt-0.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={n.actor?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {n.actor?.name.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 text-muted-foreground">
                    {typeIcon[n.type]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs leading-snug", !n.isRead && "font-medium")}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
