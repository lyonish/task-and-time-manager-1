import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .default("#6366f1"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  description: z.string().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
});

export const createWorkflowStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .default("#9ca3af"),
  isDefault: z.boolean().optional().default(false),
  isCompleted: z.boolean().optional().default(false),
});

export const updateWorkflowStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
  isDefault: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

export const reorderStatusesSchema = z.object({
  statusIds: z.array(z.string().uuid()),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateWorkflowStatusInput = z.infer<typeof createWorkflowStatusSchema>;
export type UpdateWorkflowStatusInput = z.infer<typeof updateWorkflowStatusSchema>;
export type ReorderStatusesInput = z.infer<typeof reorderStatusesSchema>;
