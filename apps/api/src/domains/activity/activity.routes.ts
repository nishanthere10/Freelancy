import { type Router as ExpressRouter, Router } from "express";
import { listActivity } from "./activity.controller";

const router: ExpressRouter = Router({ mergeParams: true });

/**
 * GET /api/v1/workspaces/:workspaceId/activity
 * List recent activity events in the workspace with pagination and entity filtering
 */
router.get("/", listActivity);

export default router;
