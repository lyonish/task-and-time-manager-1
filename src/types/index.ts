import type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  WorkflowStatus,
  Task,
  Comment,
  Mention,
  ActivityLog,
} from "@/lib/db/schema";

export type {
  User,
  NewUser,
  Workspace,
  NewWorkspace,
  WorkspaceMember,
  NewWorkspaceMember,
  Project,
  NewProject,
  WorkflowStatus,
  NewWorkflowStatus,
  Task,
  NewTask,
  Comment,
  NewComment,
  Mention,
  NewMention,
  ActivityLog,
  NewActivityLog,
} from "@/lib/db/schema";

export type Role = "Admin" | "Member" | "Guest";
export type Priority = "None" | "Low" | "Medium" | "High" | "Urgent";

export type ActionType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_completed"
  | "task_assigned"
  | "task_status_changed"
  | "task_due_date_changed"
  | "comment_added"
  | "mention_created"
  | "project_created"
  | "project_updated"
  | "member_added"
  | "member_removed"
  | "member_role_changed";

// Extended types with relations
export interface TaskWithRelations {
  id: string;
  projectId: string;
  statusId: string | null;
  title: string;
  description: string | null;
  assigneeId: string | null;
  createdBy: string;
  dueDate: Date | null;
  priority: Priority;
  position: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  completedAt: Date | null;
  assignee?: User | null;
  creator?: User;
  status?: WorkflowStatus | null;
  project?: Project;
  comments?: Comment[];
}

export interface ProjectWithRelations {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  workspace?: Workspace;
  creator?: User;
  workflowStatuses?: WorkflowStatus[];
  tasks?: Task[];
}

export interface WorkspaceWithRelations {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  ownerId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  owner?: User;
  members?: WorkspaceMemberWithUser[];
  projects?: Project[];
}

export interface WorkspaceMemberWithUser {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: Date | null;
  user?: User;
}

export interface CommentWithRelations {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  author?: User;
  mentions?: MentionWithUser[];
}

export interface MentionWithUser {
  id: string;
  commentId: string;
  mentionedUserId: string;
  createdAt: Date | null;
  mentionedUser?: User;
}

export interface ActivityLogWithRelations {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  userId: string;
  action: ActionType;
  metadata: Record<string, unknown> | null;
  createdAt: Date | null;
  user?: User;
  project?: Project | null;
  task?: Task | null;
}
