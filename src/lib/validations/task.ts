import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  statusId: z.string().uuid().optional().nullable(),
  layerId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["None", "Low", "Medium", "High", "Urgent"]).optional().default("None"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  statusId: z.string().uuid().optional().nullable(),
  layerId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["None", "Low", "Medium", "High", "Urgent"]).optional(),
});

export const changeTaskStatusSchema = z.object({
  statusId: z.string().uuid(),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

export const reorderTasksSchema = z.object({
  taskId: z.string().uuid(),
  newStatusId: z.string().uuid().optional(),
  newPosition: z.number().int().min(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeTaskStatusInput = z.infer<typeof changeTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
