"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, Users, CreditCard } from "lucide-react";

const navItems = [
  { label: "General", icon: Settings, segment: "general" },
  { label: "Members", icon: Users, segment: "members" },
  { label: "Billing", icon: CreditCard, segment: "billing" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <nav className="w-56 shrink-0 border-r border-border p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
          Settings
        </p>
        {navItems.map(({ label, icon: Icon, segment }) => {
          const href = `/workspace/${workspaceId}/settings/${segment}`;
          const isActive = pathname === href;
          return (
            <Link
              key={segment}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        {children}
      </div>
    </div>
  );
}
