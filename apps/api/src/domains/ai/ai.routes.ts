import { type Router as ExpressRouter, Router } from "express";
import {
  analyzeScopeDrift,
  confirmScopeAnalysis,
  convertScopeToProject,
  generateScopeAnalysis,
  getScopeAnalysis,
  listScopeAnalyses,
  listScopeDriftAnalyses,
  refineScopeAnalysis,
  testAiBridge,
  updateScopeAnalysisResult,
} from "./ai.controller";
import { validateBody, validateParams, validateQuery } from "./ai.middleware";
import {
  aiWorkspaceParamsSchema,
  analyzeDriftSchema,
  confirmScopeParamsSchema,
  convertScopeToProjectSchema,
  driftParamsSchema,
  generateScopeSchema,
  listScopesQuerySchema,
  refineScopeSchema,
  scopeDriftParamsSchema,
  scopeParamsSchema,
  updateScopeResultSchema,
} from "./ai.schema";

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/v1/workspaces/:workspaceId/ai/scope
router.post(
  "/scope",
  validateParams(aiWorkspaceParamsSchema),
  validateBody(generateScopeSchema),
  generateScopeAnalysis,
);

// POST /api/v1/workspaces/:workspaceId/ai/scope/:scopeId/confirm
router.post(
  "/scope/:scopeId/confirm",
  validateParams(confirmScopeParamsSchema),
  confirmScopeAnalysis,
);

// POST /api/v1/workspaces/:workspaceId/ai/scope/:scopeId/refine
router.post(
  "/scope/:scopeId/refine",
  validateParams(scopeParamsSchema),
  validateBody(refineScopeSchema),
  refineScopeAnalysis,
);

// PATCH /api/v1/workspaces/:workspaceId/ai/scope/:scopeId (Manual deliverable updates)
router.patch(
  "/scope/:scopeId",
  validateParams(scopeParamsSchema),
  validateBody(updateScopeResultSchema),
  updateScopeAnalysisResult,
);

// POST /api/v1/workspaces/:workspaceId/ai/scope/:scopeId/convert (Convert to Project + Deposit Invoice)
router.post(
  "/scope/:scopeId/convert",
  validateParams(scopeParamsSchema),
  validateBody(convertScopeToProjectSchema),
  convertScopeToProject,
);

// GET /api/v1/workspaces/:workspaceId/ai/scope/:scopeId
router.get(
  "/scope/:scopeId",
  validateParams(confirmScopeParamsSchema),
  getScopeAnalysis,
);

// GET /api/v1/workspaces/:workspaceId/ai/scope
router.get(
  "/scope",
  validateParams(aiWorkspaceParamsSchema),
  validateQuery(listScopesQuerySchema),
  listScopeAnalyses,
);

// POST /api/v1/workspaces/:workspaceId/ai/drift (Scope Drift Analysis)
router.post(
  "/drift",
  validateParams(driftParamsSchema),
  validateBody(analyzeDriftSchema),
  analyzeScopeDrift,
);

// GET /api/v1/workspaces/:workspaceId/ai/scope/:scopeAnalysisId/drift
router.get(
  "/scope/:scopeAnalysisId/drift",
  validateParams(scopeDriftParamsSchema),
  listScopeDriftAnalyses,
);

// POST /api/v1/workspaces/:workspaceId/ai/test (Bridge Connectivity Test)
router.post("/test", validateParams(aiWorkspaceParamsSchema), testAiBridge);

export default router;
