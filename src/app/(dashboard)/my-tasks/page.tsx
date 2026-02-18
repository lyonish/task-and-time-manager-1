import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const priorityColors: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
  None: "bg-gray-400",
};

async function getMyTasks(userId: string) {
  return db.query.tasks.findMany({
    where: eq(tasks.assigneeId, userId),
    orderBy: [desc(tasks.createdAt)],
    with: {
      project: true,
      status: true,
    },
  });
}

export default async function MyTasksPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userTasks = await getMyTasks(session.user.id);
  const pendingTasks = userTasks.filter((t) => !t.completedAt);
  const completedTasks = userTasks.filter((t) => t.completedAt);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground">
          All tasks assigned to you across all projects.
        </p>
      </div>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Checkbox />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.project?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.priority !== "None" && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          priorityColors[task.priority]
                        }`}
                      />
                    )}
                    {task.status && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: task.status.color || undefined,
                          color: task.status.color || undefined,
                        }}
                      >
                        {task.status.name}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No pending tasks. Great job!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Completed
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 border rounded-lg opacity-60"
                >
                  <Checkbox checked disabled />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through truncate">
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.project?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
