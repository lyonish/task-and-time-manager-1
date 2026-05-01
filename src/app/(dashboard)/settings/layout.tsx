"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Lock, Palette } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PersonalSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { label: t.settings.nav.profile,    icon: User,    segment: "profile" },
    { label: t.settings.nav.account,    icon: Lock,    segment: "account" },
    { label: t.settings.nav.appearance, icon: Palette, segment: "appearance" },
  ];

  return (
    <div className="flex h-full">
      <nav className="w-56 shrink-0 border-r border-border p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
          {t.nav.settings}
        </p>
        {navItems.map(({ label, icon: Icon, segment }) => {
          const href = `/settings/${segment}`;
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

      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {children}
      </div>
    </div>
  );
}
