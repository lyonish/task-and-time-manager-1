import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceService } from "@/services/workspace.service";
import { WorkspaceStatsPage } from "@/components/stats/WorkspaceStatsPage";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { workspaceId } = await params;

  const isMember = await WorkspaceService.isMember(workspaceId, session.user.id);
  if (!isMember) redirect("/");

  return <WorkspaceStatsPage workspaceId={workspaceId} />;
}
