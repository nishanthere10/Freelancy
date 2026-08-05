/**
 * Workspace HTTP routes
 * REST endpoints for workspace management
 */

import { type Router as ExpressRouter, Router } from "express";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  restoreWorkspace,
  updateWorkspace,
} from "./workspace.controller";
import { validateBody, validateParams } from "./workspace.middleware";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "./workspace.schema";

const router: ExpressRouter = Router();

/**
 * GET /api/v1/workspaces
 * List all workspaces for authenticated user
 */
router.get("/", listWorkspaces);

/**
 * GET /api/v1/workspaces/:id
 * Get single workspace by ID
 */
router.get("/:id", validateParams(workspaceIdSchema), getWorkspace);

/**
 * POST /api/v1/workspaces
 * Create new workspace
 */
router.post("/", validateBody(createWorkspaceSchema), createWorkspace);

/**
 * PATCH /api/v1/workspaces/:id
 * Update workspace
 */
router.patch(
  "/:id",
  validateParams(workspaceIdSchema),
  validateBody(updateWorkspaceSchema),
  updateWorkspace,
);

/**
 * DELETE /api/v1/workspaces/:id
 * Delete (soft delete) workspace
 */
router.delete("/:id", validateParams(workspaceIdSchema), deleteWorkspace);

/**
 * POST /api/v1/workspaces/:id/restore
 * Restore soft-deleted workspace
 */
router.post(
  "/:id/restore",
  validateParams(workspaceIdSchema),
  restoreWorkspace,
);

export default router;
