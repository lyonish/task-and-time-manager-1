import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
    });

    // Create a default workspace for the user
    const workspaceId = crypto.randomUUID();
    await db.insert(workspaces).values({
      id: workspaceId,
      name: `${name}'s Workspace`,
      ownerId: userId,
    });

    // Add user as admin of their workspace
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role: "Admin",
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: { id: userId, name, email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
