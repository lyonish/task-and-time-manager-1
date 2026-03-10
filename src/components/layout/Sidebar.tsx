"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  CheckSquare,
  FolderKanban,
  Plus,
  ChevronDown,
  Settings,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface SidebarProps {
  workspaceId?: string;
  workspaceName?: string;
  projects?: Project[];
}

export function Sidebar({ workspaceId, workspaceName, projects = [] }: SidebarProps) {
  const pathname = usePathname();
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);

  const navItems = [
    {
      label: "Home",
      href: workspaceId ? `/workspace/${workspaceId}` : "/",
      icon: Home,
    },
    {
      label: "My Tasks",
      href: "/my-tasks",
      icon: CheckSquare,
    },
    {
      label: "Work Log",
      href: "/work-logs",
      icon: ClipboardList,
    },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start font-semibold text-lg"
        >
          {workspaceName || "My Workspace"}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Projects Section */}
        <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto font-medium text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-3">
                <FolderKanban className="h-4 w-4" />
                Projects
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isProjectsOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {projects.map((project) => {
              const projectPath = `/workspace/${workspaceId}/project/${project.id}`;
              const isActive = pathname === projectPath;
              return (
                <Link
                  key={project.id}
                  href={projectPath}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 pl-10 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </Link>
              );
            })}
            {workspaceId && (
              <CreateProjectDialog workspaceId={workspaceId}>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 pl-10 h-auto text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </CreateProjectDialog>
            )}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-sidebar-border">
        <Link
          href={workspaceId ? `/workspace/${workspaceId}/settings` : "/"}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.includes("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
