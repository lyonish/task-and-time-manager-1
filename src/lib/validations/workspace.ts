import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  description: z.string().max(1000).nullish(),
  iconUrl: z.string().url("Must be a valid URL").max(500).nullish(),
});

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["Admin", "Member", "Guest"]).default("Member"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["Admin", "Member", "Guest"]),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
