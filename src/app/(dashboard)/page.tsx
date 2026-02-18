import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaceMembers, tasks, activityLogs } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { CheckCircle2, Clock, AlertCircle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardData(userId: string) {
  // Get user's workspace
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
  });

  if (!membership) {
    return null;
  }

  // Get user's assigned tasks
  const userTasks = await db.query.tasks.findMany({
    where: eq(tasks.assigneeId, userId),
    with: {
      project: true,
      status: true,
    },
  });

  // Get recent activity
  const recentActivity = await db.query.activityLogs.findMany({
    where: eq(activityLogs.workspaceId, membership.workspaceId),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 10,
    with: {
      user: true,
      project: true,
      task: true,
    },
  });

  const completedTasks = userTasks.filter((t) => t.completedAt);
  const pendingTasks = userTasks.filter((t) => !t.completedAt);
  const overdueTasks = pendingTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );

  return {
    stats: {
      total: userTasks.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
    },
    recentTasks: pendingTasks.slice(0, 5),
    recentActivity,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getDashboardData(session.user.id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your tasks.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.completed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.overdue || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentTasks && data.recentTasks.length > 0 ? (
            <div className="space-y-4">
              {data.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.project?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {task.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    {task.status && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${task.status.color}20`,
                          color: task.status.color || undefined,
                        }}
                      >
                        {task.status.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No tasks yet. Create a project to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
