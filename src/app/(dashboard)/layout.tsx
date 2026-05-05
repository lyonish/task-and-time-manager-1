import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, projects } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getAccessibleProjectIds } from "@/lib/projectAccess";

async function getWorkspaceData(userId: string) {
  // Get user's workspaces
  const membershipData = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
    with: {
      workspace: true,
    },
  });

  if (!membershipData?.workspace) {
    redirect("/setup");
  }

  const workspace = membershipData.workspace;

  // Get only accessible projects for this user
  const accessibleIds = await getAccessibleProjectIds(workspace.id, userId);
  const workspaceProjects = accessibleIds.length > 0
    ? await db.query.projects.findMany({
        where: inArray(projects.id, accessibleIds),
        orderBy: (projects, { asc }) => [asc(projects.name)],
      })
    : [];

  return {
    workspace,
    projects: workspaceProjects,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getWorkspaceData(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspaceId={data?.workspace.id}
        workspaceName={data?.workspace.name}
        projects={data?.projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color || "#6366f1",
        }))}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
