import { db } from "@/lib/db";
import {
  workspaces,
  workspaceMembers,
  users,
  activityLogs,
  userGroups,
  userGroupMembers,
} from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
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

    // Create default "Everyone" group and add creator
    const groupId = crypto.randomUUID();
    await db.insert(userGroups).values({
      id: groupId,
      workspaceId,
      name: "Everyone",
      isDefault: true,
    });
    await db.insert(userGroupMembers).values({ groupId, userId });

    return this.getById(workspaceId);
  }

  static async getDefaultGroup(workspaceId: string) {
    return db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.workspaceId, workspaceId),
        eq(userGroups.isDefault, true)
      ),
    });
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

    // Add to default "Everyone" group
    const defaultGroup = await this.getDefaultGroup(workspaceId);
    if (defaultGroup) {
      await db.insert(userGroupMembers).values({ groupId: defaultGroup.id, userId: user.id }).onDuplicateKeyUpdate({ set: { groupId: defaultGroup.id } });
    }

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

    // Remove from all workspace groups
    const wsGroups = await db.query.userGroups.findMany({
      where: eq(userGroups.workspaceId, workspaceId),
      columns: { id: true },
    });
    for (const g of wsGroups) {
      await db.delete(userGroupMembers).where(
        and(eq(userGroupMembers.groupId, g.id), eq(userGroupMembers.userId, userId))
      );
    }

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

  /**
   * Returns a list of user IDs that the given leader leads (has role='Leader'
   * in any group in the workspace), excluding the leader themselves.
   */
  static async getMemberableUserIds(workspaceId: string, leaderId: string): Promise<string[]> {
    // Find groups in this workspace where leaderId has role='Leader'
    const leaderGroups = await db.query.userGroupMembers.findMany({
      where: and(
        eq(userGroupMembers.userId, leaderId),
        eq(userGroupMembers.role, "Leader")
      ),
      with: {
        group: {
          columns: { id: true, workspaceId: true },
        },
      },
    });

    const leaderGroupIds = leaderGroups
      .filter((m) => m.group.workspaceId === workspaceId)
      .map((m) => m.groupId);

    if (leaderGroupIds.length === 0) return [];

    // Collect all member user IDs from those groups (excluding the leader)
    const memberSet = new Set<string>();
    for (const groupId of leaderGroupIds) {
      const members = await db.query.userGroupMembers.findMany({
        where: and(
          eq(userGroupMembers.groupId, groupId),
          ne(userGroupMembers.userId, leaderId)
        ),
        columns: { userId: true },
      });
      for (const m of members) memberSet.add(m.userId);
    }

    return Array.from(memberSet);
  }

  /**
   * Returns whether leaderId is a Leader in any group that contains targetUserId
   * (in the given workspace).
   */
  static async isLeaderOf(workspaceId: string, leaderId: string, targetUserId: string): Promise<boolean> {
    // Find groups in this workspace where leaderId has role='Leader'
    const leaderGroups = await db.query.userGroupMembers.findMany({
      where: and(
        eq(userGroupMembers.userId, leaderId),
        eq(userGroupMembers.role, "Leader")
      ),
      with: {
        group: { columns: { id: true, workspaceId: true } },
      },
    });

    const leaderGroupIds = leaderGroups
      .filter((m) => m.group.workspaceId === workspaceId)
      .map((m) => m.groupId);

    if (leaderGroupIds.length === 0) return false;

    // Check if targetUserId is a member of any of those groups
    for (const groupId of leaderGroupIds) {
      const membership = await db.query.userGroupMembers.findFirst({
        where: and(
          eq(userGroupMembers.groupId, groupId),
          eq(userGroupMembers.userId, targetUserId)
        ),
        columns: { id: true },
      });
      if (membership) return true;
    }

    return false;
  }
}
