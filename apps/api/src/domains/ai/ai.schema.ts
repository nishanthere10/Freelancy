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

export const aiWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
});

export const listScopesQuerySchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export type GenerateScopeInput = z.infer<typeof generateScopeSchema>;
export type ListScopesQuery = z.infer<typeof listScopesQuerySchema>;

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
