import { type Router as ExpressRouter, Router } from "express";
import {
  confirmScopeAnalysis,
  generateScopeAnalysis,
  getScopeAnalysis,
  listScopeAnalyses,
  testAiBridge,
} from "./ai.controller";
import { validateBody, validateParams, validateQuery } from "./ai.middleware";
import {
  aiWorkspaceParamsSchema,
  confirmScopeParamsSchema,
  generateScopeSchema,
  listScopesQuerySchema,
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

// POST /api/v1/workspaces/:workspaceId/ai/test (Bridge Connectivity Test)
router.post("/test", validateParams(aiWorkspaceParamsSchema), testAiBridge);

export default router;
