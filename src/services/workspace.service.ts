import { db } from "@/lib/db";
import {
  workspaces,
  workspaceMembers,
  users,
  activityLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  AddMemberInput,
} from "@/lib/validations/workspace";
import type { Role } from "@/types";

export class WorkspaceService {
  static async create(data: CreateWorkspaceInput, userId: string) {
    const workspaceId = crypto.randomUUID();

    await db.insert(workspaces).values({
      id: workspaceId,
      name: data.name,
      description: data.description,
      ownerId: userId,
    });

    // Add creator as admin
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role: "Admin",
    });

    return this.getById(workspaceId);
  }

  static async getById(id: string) {
    return db.query.workspaces.findFirst({
      where: eq(workspaces.id, id),
      with: {
        owner: true,
        members: {
          with: {
            user: true,
          },
        },
        projects: true,
      },
    });
  }

  static async getByUserId(userId: string) {
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, userId),
      with: {
        workspace: {
          with: {
            owner: true,
            projects: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  static async update(id: string, data: UpdateWorkspaceInput) {
    await db
      .update(workspaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id));

    return this.getById(id);
  }

  static async delete(id: string) {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  static async addMember(
    workspaceId: string,
    data: AddMemberInput,
    addedByUserId: string
  ) {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      ),
    });

    if (existingMember) {
      throw new Error("User is already a member");
    }

    const memberId = crypto.randomUUID();
    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId: user.id,
      role: data.role,
    });

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId,
      userId: addedByUserId,
      action: "member_added",
      metadata: { memberId: user.id, memberEmail: user.email, role: data.role },
    });

    return this.getMembers(workspaceId);
  }

  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: Role,
    updatedByUserId: string
  ) {
    await db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId,
      userId: updatedByUserId,
      action: "member_role_changed",
      metadata: { memberId: userId, newRole: role },
    });

    return this.getMembers(workspaceId);
  }

  static async removeMember(
    workspaceId: string,
    userId: string,
    removedByUserId: string
  ) {
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      );

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId,
      userId: removedByUserId,
      action: "member_removed",
      metadata: { memberId: userId },
    });
  }

  static async getMembers(workspaceId: string) {
    return db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
      with: {
        user: true,
      },
    });
  }

  static async getMemberRole(workspaceId: string, userId: string) {
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    return member?.role || null;
  }

  static async isMember(workspaceId: string, userId: string) {
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });

    return !!member;
  }
}
