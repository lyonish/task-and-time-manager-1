import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Returns tasks assigned to the current user, for use in selects
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.query.tasks.findMany({
      where: eq(tasks.assigneeId, session.user.id),
      columns: { id: true, title: true, projectId: true },
      with: {
        project: { columns: { id: true, name: true, color: true } },
      },
      orderBy: (tasks, { asc }) => [asc(tasks.title)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get my-tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
