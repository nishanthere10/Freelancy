import { type Router as ExpressRouter, Router } from "express";
import {
  changeProjectStatus,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  restoreProject,
  updateProject,
} from "./project.controller";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "./project.middleware";
import {
  changeProjectStatusSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  projectParamsSchema,
  updateProjectSchema,
} from "./project.schema";

const router: ExpressRouter = Router({ mergeParams: true });

router.get(
  "/",
  validateParams(projectParamsSchema),
  validateQuery(listProjectsQuerySchema),
  listProjects,
);
router.post(
  "/",
  validateParams(projectParamsSchema),
  validateBody(createProjectSchema),
  createProject,
);
router.get("/:projectId", validateParams(projectParamsSchema), getProject);
router.patch(
  "/:projectId",
  validateParams(projectParamsSchema),
  validateBody(updateProjectSchema),
  updateProject,
);
router.patch(
  "/:projectId/status",
  validateParams(projectParamsSchema),
  validateBody(changeProjectStatusSchema),
  changeProjectStatus,
);
router.delete(
  "/:projectId",
  validateParams(projectParamsSchema),
  deleteProject,
);
router.post(
  "/:projectId/restore",
  validateParams(projectParamsSchema),
  restoreProject,
);

export default router;
