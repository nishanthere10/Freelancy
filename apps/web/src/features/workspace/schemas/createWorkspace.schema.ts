/**
 * Zod schema for create workspace form validation
 * Single source of truth for form validation rules
 */

import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .min(3, 'Workspace name must be at least 3 characters')
    .max(100, 'Workspace name must be less than 100 characters'),
  slug: z
    .string()
    .min(1, 'Workspace slug is required')
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;
