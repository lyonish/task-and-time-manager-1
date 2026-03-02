CREATE TABLE `activity_logs` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`project_id` varchar(36),
	`task_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`action` enum('task_created','task_updated','task_deleted','task_completed','task_assigned','task_status_changed','task_due_date_changed','comment_added','mention_created','project_created','project_updated','member_added','member_removed','member_role_changed') NOT NULL,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentions` (
	`id` varchar(36) NOT NULL,
	`comment_id` varchar(36) NOT NULL,
	`mentioned_user_id` varchar(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`status_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`assignee_id` varchar(36),
	`due_date` timestamp,
	`position` int NOT NULL DEFAULT 0,
	`is_completed` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_layers` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `task_layers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`status_id` varchar(36),
	`layer_id` varchar(36),
	`parent_task_id` varchar(36),
	`title` varchar(500) NOT NULL,
	`description` text,
	`assignee_id` varchar(36),
	`created_by` varchar(36) NOT NULL,
	`due_date` timestamp,
	`priority` enum('None','Low','Medium','High','Urgent') NOT NULL DEFAULT 'None',
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`avatar_url` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `work_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`task_id` varchar(36),
	`start_time` timestamp NOT NULL,
	`end_time` timestamp,
	`note` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_statuses` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) DEFAULT '#9ca3af',
	`position` int NOT NULL DEFAULT 0,
	`is_default` boolean DEFAULT false,
	`is_completed` boolean DEFAULT false,
	CONSTRAINT `workflow_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('Admin','Project_Manager','Team_Member') NOT NULL DEFAULT 'Team_Member',
	`joined_at` timestamp DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_workspace_member` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`owner_id` varchar(36) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_activity_workspace` ON `activity_logs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_project` ON `activity_logs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_task` ON `activity_logs` (`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_user` ON `activity_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_comments_task` ON `comments` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_created` ON `comments` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_mentions_user` ON `mentions` (`mentioned_user_id`);--> statement-breakpoint
CREATE INDEX `idx_mentions_comment` ON `mentions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_workspace` ON `projects` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_steps_task` ON `steps` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_steps_status` ON `steps` (`task_id`,`status_id`);--> statement-breakpoint
CREATE INDEX `idx_steps_position` ON `steps` (`task_id`,`status_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_steps_assignee` ON `steps` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `idx_tl_project` ON `task_layers` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_tl_position` ON `task_layers` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assignee` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_layer` ON `tasks` (`layer_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent` ON `tasks` (`parent_task_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_due` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_position` ON `tasks` (`project_id`,`status_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_work_logs_user` ON `work_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_work_logs_task` ON `work_logs` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_work_logs_start` ON `work_logs` (`user_id`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_ws_project` ON `workflow_statuses` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_ws_position` ON `workflow_statuses` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_wm_workspace` ON `workspace_members` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_wm_user` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_workspaces_owner` ON `workspaces` (`owner_id`);