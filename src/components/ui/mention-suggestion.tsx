"use client";

import { ReactRenderer } from "@tiptap/react";
import { SuggestionOptions } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";

export interface MentionMember {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

// ── Dropdown list component ────────────────────────────────────────────────────

interface MentionListProps {
  items: MentionMember[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selected]) command({ id: items[selected].id, label: items[selected].name });
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="z-50 min-w-[180px] max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md py-1">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.id, label: item.name })}
            className={cn(
              "w-full flex flex-col px-3 py-1.5 text-left text-sm hover:bg-accent",
              i === selected && "bg-accent"
            )}
          >
            <span className="font-medium">{item.name}</span>
            {item.email && (
              <span className="text-xs text-muted-foreground">{item.email}</span>
            )}
          </button>
        ))}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

// ── Suggestion config factory ──────────────────────────────────────────────────

export function createMentionSuggestion(
  members: MentionMember[]
): Omit<SuggestionOptions, "editor"> {
  return {
    items({ query }) {
      return members.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.email?.toLowerCase().includes(query.toLowerCase())
      );
    },

    render() {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: HTMLDivElement | null = null;

      return {
        onStart(props) {
          popup = document.createElement("div");
          popup.style.position = "fixed";
          popup.style.zIndex = "9999";
          document.body.appendChild(popup);

          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup.appendChild(component.element);
          positionPopup(popup, props.clientRect);
        },

        onUpdate(props) {
          component?.updateProps(props);
          if (popup) positionPopup(popup, props.clientRect);
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            cleanup();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          cleanup();
        },
      };

      function cleanup() {
        component?.destroy();
        popup?.remove();
        popup = null;
        component = null;
      }

      function positionPopup(
        el: HTMLDivElement,
        getRectFn: (() => DOMRect | null) | null | undefined
      ) {
        const rect = getRectFn?.();
        if (!rect) return;
        el.style.top = `${rect.bottom + window.scrollY + 4}px`;
        el.style.left = `${rect.left + window.scrollX}px`;
      }
    },
  };
}
