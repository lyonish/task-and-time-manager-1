"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Sparkles, Contrast, Check, PanelRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useDetailPanelSize, type DetailPanelSize } from "@/hooks/useDetailPanelSize";

const themes = [
  { value: "light",              label: "Light",         description: "Clean white background",        icon: Sun },
  { value: "dark",               label: "Dark",          description: "Easy on the eyes at night",     icon: Moon },
  { value: "twilight",           label: "Twilight",      description: "Warm sunset-inspired tones",    icon: Sparkles },
  { value: "high-contrast-dark", label: "High Contrast", description: "Maximum readability",           icon: Contrast },
  { value: "system",             label: "System",        description: "Follows your OS preference",    icon: Monitor },
] as const;

const panelSizes: { value: DetailPanelSize; label: string; description: string }[] = [
  { value: "narrow", label: "Narrow",  description: "Compact side panel" },
  { value: "medium", label: "Medium",  description: "Balanced width" },
  { value: "wide",   label: "Wide",    description: "Spacious panel" },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { size: panelSize, updateSize } = useDetailPanelSize();

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize how the app looks for you.</p>
      </div>

      <Separator />

      <div className="space-y-1">
        <h2 className="text-base font-semibold">Theme</h2>
        <p className="text-sm text-muted-foreground">Select a color theme for the interface.</p>
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
        <h2 className="text-base font-semibold">Detail panel size</h2>
        <p className="text-sm text-muted-foreground">Controls the width of the task detail panel.</p>
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
    </div>
  );
}
