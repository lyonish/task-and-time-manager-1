import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { TaskList } from "@/components/tasks/TaskList";
import { WorkflowSettings } from "@/components/workflow/WorkflowSettings";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { workspaceId, projectId } = await params;

  // Check membership
  const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
  if (!isMember) {
    redirect("/");
  }

  const project = await ProjectService.getProjectWithTasks(projectId);
  if (!project) {
    redirect(`/workspace/${workspaceId}`);
  }

  // Get workspace members for assignment
  const members = await WorkspaceService.getMembers(workspaceId);

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: project.color || "#6366f1" }}
            />
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <WorkflowSettings
            projectId={projectId}
            statuses={project.workflowStatuses || []}
          />
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        <TaskList
          projectId={projectId}
          statuses={project.workflowStatuses || []}
          tasks={project.tasks || []}
          members={members.map((m) => ({
            id: m.user!.id,
            name: m.user!.name,
            email: m.user!.email,
            avatarUrl: m.user!.avatarUrl,
          }))}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
