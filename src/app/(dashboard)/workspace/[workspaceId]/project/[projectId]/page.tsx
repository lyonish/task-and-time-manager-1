import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceService } from "@/services/workspace.service";
import { ProjectService } from "@/services/project.service";
import { ProjectContent } from "@/components/projects/ProjectContent";
import { db } from "@/lib/db";
import { projectViews } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

  const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
  if (!isMember) {
    redirect("/");
  }

  const project = await ProjectService.getProjectWithTasks(projectId);
  if (!project) {
    redirect(`/workspace/${workspaceId}`);
  }

  const members = await WorkspaceService.getMembers(workspaceId);

  let views = await db
    .select()
    .from(projectViews)
    .where(eq(projectViews.projectId, projectId))
    .orderBy(asc(projectViews.position));

  if (views.length === 0) {
    const [created] = await db
      .insert(projectViews)
      .values({
        projectId,
        name: "All Tasks",
        isDefault: true,
        position: 0,
        config: { groupBy: "none", viewMode: "list", isCompact: false },
        createdBy: session.user.id,
      })
      .$returningId();
    views = await db
      .select()
      .from(projectViews)
      .where(eq(projectViews.id, created.id))
      .limit(1);
  }

  return (
    <ProjectContent
      project={{
        id: project.id,
        name: project.name,
        description: project.description ?? null,
        color: project.color ?? null,
      }}
      statuses={project.workflowStatuses || []}
      layers={project.taskLayers || []}
      tasks={project.tasks || []}
      members={members.map((m) => ({
        id: m.user!.id,
        name: m.user!.name,
        email: m.user!.email,
        avatarUrl: m.user!.avatarUrl,
      }))}
      currentUserId={session.user.id}
      initialViews={views}
    />
  );
}
