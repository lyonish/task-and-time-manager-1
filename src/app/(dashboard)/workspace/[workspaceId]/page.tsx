import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { workspaceId } = await params;

  // Check membership
  const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
  if (!isMember) {
    redirect("/");
  }

  const workspace = await WorkspaceService.getById(workspaceId);
  const projects = await ProjectService.getByWorkspaceId(workspaceId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace?.name}</h1>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateProjectDialog workspaceId={workspaceId} />
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/workspace/${workspaceId}/project/${project.id}`}
            >
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: project.color || "#6366f1" }}
                    />
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {project.workflowStatuses?.map((status) => (
                      <span
                        key={status.id}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${status.color}20`,
                          color: status.color || undefined,
                        }}
                      >
                        {status.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to start managing tasks.
            </p>
            <CreateProjectDialog workspaceId={workspaceId}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CreateProjectDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
