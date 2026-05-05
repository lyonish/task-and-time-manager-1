import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await NotificationService.getForUser(session.user.id);
  const unreadCount = items.filter((n) => !n.isRead).length;
  return NextResponse.json({ items, unreadCount });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await NotificationService.markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
