import { type Router as ExpressRouter, Router } from "express";
import {
  backfillProjectDeliverables,
  createProgressInvoice,
  createProjectDeliverable,
  deleteProjectDeliverable,
  listProjectDeliverables,
  updateProjectDeliverable,
} from "./project-deliverable.controller";
import {
  createProgressInvoiceSchema,
  createProjectDeliverableSchema,
  projectDeliverableParamsSchema,
  updateProjectDeliverableSchema,
} from "./project-deliverable.schema";
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

// Deliverables & Execution Engine Subroutes
router.get(
  "/:projectId/deliverables",
  validateParams(projectParamsSchema),
  listProjectDeliverables,
);
router.post(
  "/:projectId/deliverables",
  validateParams(projectParamsSchema),
  validateBody(createProjectDeliverableSchema),
  createProjectDeliverable,
);
router.patch(
  "/:projectId/deliverables/:deliverableId",
  validateParams(projectDeliverableParamsSchema),
  validateBody(updateProjectDeliverableSchema),
  updateProjectDeliverable,
);
router.delete(
  "/:projectId/deliverables/:deliverableId",
  validateParams(projectDeliverableParamsSchema),
  deleteProjectDeliverable,
);
router.post(
  "/:projectId/invoices/progress",
  validateParams(projectParamsSchema),
  validateBody(createProgressInvoiceSchema),
  createProgressInvoice,
);
router.post(
  "/:projectId/deliverables/backfill",
  validateParams(projectParamsSchema),
  backfillProjectDeliverables,
);

export default router;
