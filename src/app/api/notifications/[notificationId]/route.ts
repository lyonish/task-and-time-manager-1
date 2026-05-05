import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await params;
  await NotificationService.markRead(notificationId, session.user.id);
  return NextResponse.json({ ok: true });
}
