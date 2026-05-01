"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, Users, CreditCard, UsersRound } from "lucide-react";
import { WorkspaceRoleProvider, useWorkspaceRole } from "@/components/settings/WorkspaceRoleContext";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function SettingsNav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const { canEdit } = useWorkspaceRole();
  const { t } = useLanguage();

  const ALL_NAV = [
    { label: t.settings.nav.general,  icon: Settings,   segment: "general",  adminOnly: false },
    { label: t.settings.nav.members,  icon: Users,       segment: "members",  adminOnly: false },
    { label: t.settings.nav.groups,   icon: UsersRound,  segment: "groups",   adminOnly: false },
    { label: t.settings.nav.billing,  icon: CreditCard,  segment: "billing",  adminOnly: true  },
  ];

  const navItems = ALL_NAV.filter((item) => !item.adminOnly || canEdit);

  return (
    <nav className="w-56 shrink-0 border-r border-border p-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
        {t.nav.settings}
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
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <WorkspaceRoleProvider workspaceId={workspaceId}>
      <div className="flex h-full">
        <SettingsNav workspaceId={workspaceId} />
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
          {children}
        </div>
      </div>
    </WorkspaceRoleProvider>
  );
}
