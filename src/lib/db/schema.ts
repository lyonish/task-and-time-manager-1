import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  int,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// =============================================
// USERS & AUTHENTICATION
// =============================================
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_users_email").on(table.email)]
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMembers: many(workspaceMembers),
  createdProjects: many(projects),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  comments: many(comments),
  mentions: many(mentions),
  activityLogs: many(activityLogs),
}));

// =============================================
// WORKSPACES
// =============================================
export const workspaces = mysqlTable(
  "workspaces",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    ownerId: varchar("owner_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_workspaces_owner").on(table.ownerId)]
);

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  projects: many(projects),
  activityLogs: many(activityLogs),
}));

export const workspaceMembers = mysqlTable(
  "workspace_members",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    role: mysqlEnum("role", ["Admin", "Project_Manager", "Team_Member"])
      .notNull()
      .default("Team_Member"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_workspace_member").on(table.workspaceId, table.userId),
    index("idx_wm_workspace").on(table.workspaceId),
    index("idx_wm_user").on(table.userId),
  ]
);

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

// =============================================
// PROJECTS & WORKFLOWS
// =============================================
export const projects = mysqlTable(
  "projects",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }).default("#6366f1"),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_projects_workspace").on(table.workspaceId)]
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  workflowStatuses: many(workflowStatuses),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
}));

export const workflowStatuses = mysqlTable(
  "workflow_statuses",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: varchar("project_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).default("#9ca3af"),
    position: int("position").notNull().default(0),
    isDefault: boolean("is_default").default(false),
    isCompleted: boolean("is_completed").default(false),
  },
  (table) => [
    index("idx_ws_project").on(table.projectId),
    index("idx_ws_position").on(table.projectId, table.position),
  ]
);

export const workflowStatusesRelations = relations(
  workflowStatuses,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [workflowStatuses.projectId],
      references: [projects.id],
    }),
    tasks: many(tasks),
  })
);

// =============================================
// TASKS
// =============================================
export const tasks = mysqlTable(
  "tasks",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: varchar("project_id", { length: 36 }).notNull(),
    statusId: varchar("status_id", { length: 36 }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    assigneeId: varchar("assignee_id", { length: 36 }),
    createdBy: varchar("created_by", { length: 36 }).notNull(),
    dueDate: timestamp("due_date"),
    priority: mysqlEnum("priority", ["None", "Low", "Medium", "High", "Urgent"])
      .notNull()
      .default("None"),
    position: int("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("idx_tasks_project").on(table.projectId),
    index("idx_tasks_assignee").on(table.assigneeId),
    index("idx_tasks_status").on(table.statusId),
    index("idx_tasks_due").on(table.dueDate),
    index("idx_tasks_position").on(table.projectId, table.statusId, table.position),
  ]
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  status: one(workflowStatuses, {
    fields: [tasks.statusId],
    references: [workflowStatuses.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  comments: many(comments),
  activityLogs: many(activityLogs),
}));

// =============================================
// COMMENTS & MENTIONS
// =============================================
export const comments = mysqlTable(
  "comments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: varchar("task_id", { length: 36 }).notNull(),
    authorId: varchar("author_id", { length: 36 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_comments_task").on(table.taskId),
    index("idx_comments_created").on(table.createdAt),
  ]
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  mentions: many(mentions),
}));

export const mentions = mysqlTable(
  "mentions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: varchar("comment_id", { length: 36 }).notNull(),
    mentionedUserId: varchar("mentioned_user_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_mentions_user").on(table.mentionedUserId),
    index("idx_mentions_comment").on(table.commentId),
  ]
);

export const mentionsRelations = relations(mentions, ({ one }) => ({
  comment: one(comments, {
    fields: [mentions.commentId],
    references: [comments.id],
  }),
  mentionedUser: one(users, {
    fields: [mentions.mentionedUserId],
    references: [users.id],
  }),
}));

// =============================================
// ACTIVITY LOG
// =============================================
export const activityLogs = mysqlTable(
  "activity_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
    projectId: varchar("project_id", { length: 36 }),
    taskId: varchar("task_id", { length: 36 }),
    userId: varchar("user_id", { length: 36 }).notNull(),
    action: mysqlEnum("action", [
      "task_created",
      "task_updated",
      "task_deleted",
      "task_completed",
      "task_assigned",
      "task_status_changed",
      "task_due_date_changed",
      "comment_added",
      "mention_created",
      "project_created",
      "project_updated",
      "member_added",
      "member_removed",
      "member_role_changed",
    ]).notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_activity_workspace").on(table.workspaceId, table.createdAt),
    index("idx_activity_project").on(table.projectId, table.createdAt),
    index("idx_activity_task").on(table.taskId, table.createdAt),
    index("idx_activity_user").on(table.userId, table.createdAt),
  ]
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [activityLogs.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [activityLogs.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [activityLogs.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WorkflowStatus = typeof workflowStatuses.$inferSelect;
export type NewWorkflowStatus = typeof workflowStatuses.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
