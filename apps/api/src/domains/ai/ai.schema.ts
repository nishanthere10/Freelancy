import { z } from "zod";

export const generateScopeSchema = z.object({
  inputText: z
    .string({ required_error: "inputText is required" })
    .min(10, "inputText must be at least 10 characters long"),
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
});

export const confirmScopeParamsSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  scopeId: z.string().uuid("scopeId must be a valid UUID"),
});

export const scopeParamsSchema = confirmScopeParamsSchema;

export const aiWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
});

export const listScopesQuerySchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const refineScopeSchema = z.object({
  revisionPrompt: z
    .string({ required_error: "revisionPrompt is required" })
    .min(5, "revisionPrompt must be at least 5 characters long")
    .max(1000, "revisionPrompt cannot exceed 1000 characters"),
});

export const deliverableItemSchema = z.object({
  title: z.string().trim().min(1, "Deliverable title is required"),
  description: z.string().trim().min(1, "Deliverable description is required"),
  estimated_hours: z.coerce
    .number()
    .int()
    .positive("estimated_hours must be a positive integer"),
  complexity: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toLowerCase().trim() : v),
      z.enum(["low", "medium", "high"]),
    )
    .default("medium"),
  skills_required: z
    .array(z.string())
    .nullish()
    .transform((v) => v || []),
});

export const updateScopeResultSchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  deliverables: z
    .array(deliverableItemSchema)
    .min(1, "At least one deliverable is required"),
  timeline_weeks: z.coerce
    .number()
    .int()
    .positive("timeline_weeks must be positive"),
  risks_and_dependencies: z
    .array(z.string())
    .nullish()
    .transform((v) => v || []),
  recommended_tech_stack: z
    .array(z.string())
    .nullish()
    .transform((v) => v || []),
  confidence_score: z.coerce.number().min(1).max(100).default(90),
});

export const convertScopeToProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : undefined)),
  clientId: z
    .union([z.string().uuid("clientId must be a valid UUID"), z.literal("")])
    .optional()
    .nullable()
    .transform((val) => (val ? val : undefined)),
  status: z
    .enum(["lead", "proposal", "active", "completed", "cancelled"])
    .default("active"),
  startDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  targetDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  currency: z
    .string()
    .min(3)
    .max(3)
    .transform((c) => c.toUpperCase())
    .default("USD"),
  depositPercentage: z.coerce.number().min(0).max(100).default(0),
  depositDueDays: z.coerce.number().int().positive().default(14),
});

export type GenerateScopeInput = z.infer<typeof generateScopeSchema>;
export type ListScopesQuery = z.infer<typeof listScopesQuerySchema>;
export type RefineScopeInput = z.infer<typeof refineScopeSchema>;
export type UpdateScopeResultInput = z.infer<typeof updateScopeResultSchema>;
export type ConvertScopeToProjectInput = z.infer<
  typeof convertScopeToProjectSchema
>;

export const analyzeDriftSchema = z.object({
  changeRequestText: z
    .string({ required_error: "changeRequestText is required" })
    .min(10, "changeRequestText must be at least 10 characters"),
  scopeAnalysisId: z.string().uuid("scopeAnalysisId must be a valid UUID"),
});

export const driftParamsSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
});

export const scopeDriftParamsSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  scopeAnalysisId: z.string().uuid("scopeAnalysisId must be a valid UUID"),
});

export type AnalyzeDriftInput = z.infer<typeof analyzeDriftSchema>;
