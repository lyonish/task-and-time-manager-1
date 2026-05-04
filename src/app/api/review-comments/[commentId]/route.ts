import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReviewService } from "@/services/review.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const body = await request.json() as { content: string };

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const isOwner = await ReviewService.isAuthor(commentId, session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await ReviewService.updateComment(commentId, body.content.trim());
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/review-comments/[commentId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    const isOwner = await ReviewService.isAuthor(commentId, session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ReviewService.deleteComment(commentId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/review-comments/[commentId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
