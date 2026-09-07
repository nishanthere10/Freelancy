import { type Router as ExpressRouter, Router } from "express";
import {
  analyzeScopeDrift,
  confirmScopeAnalysis,
  generateScopeAnalysis,
  getScopeAnalysis,
  listScopeAnalyses,
  listScopeDriftAnalyses,
  testAiBridge,
} from "./ai.controller";
import { validateBody, validateParams, validateQuery } from "./ai.middleware";
import {
  aiWorkspaceParamsSchema,
  analyzeDriftSchema,
  confirmScopeParamsSchema,
  driftParamsSchema,
  generateScopeSchema,
  listScopesQuerySchema,
  scopeDriftParamsSchema,
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
