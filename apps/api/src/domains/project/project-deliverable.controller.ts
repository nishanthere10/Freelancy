import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import {
  ActivityEventConsumer,
  InvoiceEventEmitterAdapter,
} from "../activity/activity.consumer";
import { ActivityRepository } from "../activity/repository/activity.repository";
import { ScopeAnalysisRepository } from "../ai/repository";
import { ClientRepository } from "../client/repository/client.repository";
import { InvoiceService } from "../invoice/invoice.service";
import { InvoiceRepository } from "../invoice/repository/invoice.repository";
import { WorkspaceMemberRepository } from "../workspace/repository";
import type {
  CreateProgressInvoiceInput,
  CreateProjectDeliverableInput,
  UpdateProjectDeliverableInput,
} from "./project-deliverable.schema";
import { ProjectDeliverableService } from "./project-deliverable.service";
import { ProjectDeliverableRepository } from "./repository/project-deliverable.repository";
import { ProjectRepository } from "./repository/project.repository";

interface AuthRequest extends Request {
  user?: { id: string };
}

const activityRepo = new ActivityRepository();
const activityConsumer = new ActivityEventConsumer(activityRepo);
const invoiceEmitter = new InvoiceEventEmitterAdapter(activityConsumer);

const invoiceService = new InvoiceService(
  new InvoiceRepository(),
  new WorkspaceMemberRepository(),
  new ClientRepository(),
  new ProjectRepository(),
  invoiceEmitter,
);

const deliverableRepo = new ProjectDeliverableRepository();
const projectRepo = new ProjectRepository();
const memberRepo = new WorkspaceMemberRepository();
const scopeRepo = new ScopeAnalysisRepository();

export const projectDeliverableService = new ProjectDeliverableService(
  deliverableRepo,
  projectRepo,
  memberRepo,
  invoiceService,
  scopeRepo,
);

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

function handleDeliverableError(
  res: Response,
  error: Error & { code?: string; statusCode?: number },
) {
  const statusCode = error.statusCode || 400;
  const code = error.code || "BAD_REQUEST";

  switch (code) {
    case "PROJECT_NOT_FOUND":
    case "DELIVERABLE_NOT_FOUND":
      return res.status(404).json(createError("NOT_FOUND", error.message));
    case "PERMISSION_DENIED":
      return res.status(403).json(createError("FORBIDDEN", error.message));
    case "DELIVERABLE_ALREADY_BILLED":
    case "CONFLICT":
      return res.status(409).json(createError("CONFLICT", error.message));
    case "CLIENT_REQUIRED":
    case "DELIVERABLE_VALIDATION_ERROR":
      return res
        .status(422)
        .json(createError("VALIDATION_ERROR", error.message));
    default:
      return res.status(statusCode).json(createError(code, error.message));
  }
}

/**
 * GET /workspaces/:workspaceId/projects/:projectId/deliverables
 * Returns deliverables and deterministic progress.
 * Read-only: never mutates database rows.
 */
export async function listProjectDeliverables(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await projectDeliverableService.listDeliverables(
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/deliverables
 */
export async function createProjectDeliverable(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const body = req.body as CreateProjectDeliverableInput;
    const result = await projectDeliverableService.createDeliverable(
      projectId,
      workspaceId,
      userId,
      body,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(201).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /workspaces/:workspaceId/projects/:projectId/deliverables/:deliverableId
 */
export async function updateProjectDeliverable(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId, deliverableId } = req.params as {
      workspaceId: string;
      projectId: string;
      deliverableId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const body = req.body as UpdateProjectDeliverableInput;
    const result = await projectDeliverableService.updateDeliverable(
      deliverableId,
      projectId,
      workspaceId,
      userId,
      body,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /workspaces/:workspaceId/projects/:projectId/deliverables/:deliverableId
 */
export async function deleteProjectDeliverable(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId, deliverableId } = req.params as {
      workspaceId: string;
      projectId: string;
      deliverableId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await projectDeliverableService.deleteDeliverable(
      deliverableId,
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(200).json(createSuccess({ deleted: true }));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/invoices/progress
 * Generates an itemized progress invoice from completed deliverables.
 */
export async function createProgressInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const body = req.body as CreateProgressInvoiceInput;
    const result = await projectDeliverableService.createProgressInvoice(
      projectId,
      workspaceId,
      userId,
      body,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(201).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/deliverables/backfill
 * Explicit backfill for legacy projects created prior to Sprint 17.
 */
export async function backfillProjectDeliverables(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const userId = getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await projectDeliverableService.backfillProjectDeliverables(
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      return handleDeliverableError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}
