"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Sparkles, Contrast, Check, PanelRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useDetailPanelSize, type DetailPanelSize } from "@/hooks/useDetailPanelSize";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { type Locale } from "@/lib/i18n/translations";
import { Globe } from "lucide-react";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { size: panelSize, updateSize } = useDetailPanelSize();
  const { lang, setLang, t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const themes = [
    { value: "light",              label: t.settings.appearance.themes.light.label,              description: t.settings.appearance.themes.light.description,              icon: Sun },
    { value: "dark",               label: t.settings.appearance.themes.dark.label,               description: t.settings.appearance.themes.dark.description,               icon: Moon },
    { value: "twilight",           label: t.settings.appearance.themes.twilight.label,           description: t.settings.appearance.themes.twilight.description,           icon: Sparkles },
    { value: "high-contrast-dark", label: t.settings.appearance.themes["high-contrast-dark"].label, description: t.settings.appearance.themes["high-contrast-dark"].description, icon: Contrast },
    { value: "system",             label: t.settings.appearance.themes.system.label,             description: t.settings.appearance.themes.system.description,             icon: Monitor },
  ] as const;

  const panelSizes: { value: DetailPanelSize; label: string; description: string }[] = [
    { value: "narrow", label: t.settings.appearance.panelSizes.narrow.label, description: t.settings.appearance.panelSizes.narrow.description },
    { value: "medium", label: t.settings.appearance.panelSizes.medium.label, description: t.settings.appearance.panelSizes.medium.description },
    { value: "wide",   label: t.settings.appearance.panelSizes.wide.label,   description: t.settings.appearance.panelSizes.wide.description },
  ];

  const languages: { value: Locale; label: string; description: string }[] = [
    { value: "en", label: t.settings.appearance.languages.en.label, description: t.settings.appearance.languages.en.description },
    { value: "ja", label: t.settings.appearance.languages.ja.label, description: t.settings.appearance.languages.ja.description },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.settings.appearance.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.settings.appearance.subtitle}</p>
      </div>

      <Separator />

      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t.settings.appearance.theme}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.appearance.themeSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map(({ value, label, description, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors",
                active
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {active && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t.settings.appearance.panelSize}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.appearance.panelSizeSubtitle}</p>
      </div>

      <div className="flex gap-3">
        {panelSizes.map(({ value, label, description }) => {
          const active = mounted && panelSize === value;
          return (
            <button
              key={value}
              onClick={() => updateSize(value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-center transition-colors",
                active
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <PanelRight className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {active && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t.settings.appearance.language}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.appearance.languageSubtitle}</p>
      </div>

      <div className="flex gap-3">
        {languages.map(({ value, label, description }) => {
          const active = mounted && lang === value;
          return (
            <button
              key={value}
              onClick={() => setLang(value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-center transition-colors",
                active
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {active && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
