/**
 * Workspace validation schemas
 * Zod schemas for request validation
 */

import { z } from "zod";

/**
 * Slug validation: lowercase alphanumeric with hyphens, 3-50 characters
 * Additional: Cannot start or end with hyphen, cannot contain consecutive hyphens
 */
const slugSchema = z
  .string()
  .toLowerCase()
  .trim()
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens",
  )
  .regex(/^[a-z0-9]/, "Slug must start with a letter or number")
  .regex(/[a-z0-9]$/, "Slug must end with a letter or number")
  .regex(/^(?!.*--)[a-z0-9-]+$/, "Slug cannot contain consecutive hyphens")
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must not exceed 50 characters");

/**
 * Create workspace schema
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Workspace name is required")
    .max(255, "Workspace name must not exceed 255 characters"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters")
    .nullable()
    .optional()
    .transform((val) => val || undefined), // Convert empty string/null to undefined
  logo: z
    .string()
    .trim()
    .url("Logo must be a valid URL")
    .nullable()
    .optional()
    .transform((val) => val || undefined), // Convert empty string/null to undefined
  ownerId: z.string().uuid("Owner ID must be a valid UUID"),
});

export type CreateWorkspaceSchema = z.infer<typeof createWorkspaceSchema>;

/**
 * Update workspace schema
 */
export const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Workspace name is required")
      .max(255, "Workspace name must not exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must not exceed 1000 characters")
      .nullable()
      .optional()
      .transform((val) => val || undefined), // Convert empty string/null to undefined
    logo: z
      .string()
      .trim()
      .url("Logo must be a valid URL")
      .nullable()
      .optional()
      .transform((val) => val || undefined), // Convert empty string/null to undefined
  })
  .strict(); // Reject unknown fields

export type UpdateWorkspaceSchema = z.infer<typeof updateWorkspaceSchema>;

/**
 * Workspace member role enum
 */
export const workspaceRoleSchema = z.enum(["owner", "editor", "viewer"]);

export type WorkspaceRoleSchema = z.infer<typeof workspaceRoleSchema>;

/**
 * Create workspace member schema
 */
export const createWorkspaceMemberSchema = z
  .object({
    workspaceId: z.string().uuid("Workspace ID must be a valid UUID"),
    userId: z.string().uuid("User ID must be a valid UUID"),
    role: workspaceRoleSchema.default("viewer"),
    invitedBy: z.string().uuid("Invited by must be a valid UUID").optional(),
  })
  .strict(); // Reject unknown fields

export type CreateWorkspaceMemberSchema = z.infer<
  typeof createWorkspaceMemberSchema
>;

/**
 * Update workspace member schema
 */
export const updateWorkspaceMemberSchema = z
  .object({
    role: workspaceRoleSchema.optional(),
  })
  .strict(); // Reject unknown fields

export type UpdateWorkspaceMemberSchema = z.infer<
  typeof updateWorkspaceMemberSchema
>;

/**
 * Query parameter schemas
 */
export const workspaceQuerySchema = z
  .object({
    ownerId: z.string().uuid().optional(),
    excludeDeleted: z.boolean().default(true),
  })
  .strict();

export const workspaceMemberQuerySchema = z
  .object({
    workspaceId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    role: workspaceRoleSchema.optional(),
    excludeDeleted: z.boolean().default(true),
  })
  .strict();

/**
 * Workspace ID parameter schema
 */
export const workspaceIdSchema = z
  .object({
    id: z.string().uuid("Workspace ID must be a valid UUID"),
  })
  .strict();
