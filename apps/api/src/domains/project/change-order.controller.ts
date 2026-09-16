import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import {
  ActivityEventConsumer,
  InvoiceEventEmitterAdapter,
  ProjectEventEmitterAdapter,
} from "../activity/activity.consumer";
import { ActivityRepository } from "../activity/repository/activity.repository";
import { ScopeAnalysisRepository } from "../ai/repository";
import { ClientRepository } from "../client/repository/client.repository";
import { InvoiceService } from "../invoice/invoice.service";
import { InvoiceRepository } from "../invoice/repository/invoice.repository";
import { WorkspaceMemberRepository } from "../workspace/repository";
import {
  approveChangeOrderSchema,
  changeOrderParamsSchema,
  createChangeOrderSchema,
  updateChangeOrderDraftSchema,
} from "./change-order.schema";
import { ChangeOrderService } from "./change-order.service";
import { ChangeOrderRepository } from "./repository/change-order.repository";
import { ProjectDeliverableRepository } from "./repository/project-deliverable.repository";
import { ProjectRepository } from "./repository/project.repository";

interface AuthRequest extends Request {
  user?: { id: string };
}

const activityRepo = new ActivityRepository();
const activityConsumer = new ActivityEventConsumer(activityRepo);
const invoiceEmitter = new InvoiceEventEmitterAdapter(activityConsumer);
const projectEmitter = new ProjectEventEmitterAdapter(activityConsumer);

const invoiceService = new InvoiceService(
  new InvoiceRepository(),
  new WorkspaceMemberRepository(),
  new ClientRepository(),
  new ProjectRepository(),
  invoiceEmitter,
);

const changeOrderRepo = new ChangeOrderRepository();
const deliverableRepo = new ProjectDeliverableRepository();
const projectRepo = new ProjectRepository();
const memberRepo = new WorkspaceMemberRepository();
const scopeRepo = new ScopeAnalysisRepository();

export const changeOrderService = new ChangeOrderService(
  changeOrderRepo,
  deliverableRepo,
  projectRepo,
  memberRepo,
  invoiceService,
  scopeRepo,
  projectEmitter,
);

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

function handleChangeOrderError(
  res: Response,
  error: Error & { code?: string; statusCode?: number },
) {
  const statusCode = error.statusCode || 400;
  const code = error.code || "BAD_REQUEST";

  switch (code) {
    case "PROJECT_NOT_FOUND":
    case "CHANGE_ORDER_NOT_FOUND":
      return res.status(404).json(createError("NOT_FOUND", error.message));
    case "PERMISSION_DENIED":
      return res.status(403).json(createError("FORBIDDEN", error.message));
    case "CHANGE_ORDER_CONFLICT":
    case "CONFLICT":
      return res.status(409).json(createError("CONFLICT", error.message));
    case "INVALID_PROJECT_STATE":
    case "CHANGE_ORDER_VALIDATION_ERROR":
      return res
        .status(422)
        .json(createError("VALIDATION_ERROR", error.message));
    default:
      return res.status(statusCode).json(createError(code, error.message));
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/change-orders
 * Creates a new change order proposal in draft status.
 */
export async function createChangeOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            paramsParsed.error.issues[0]?.message || "Invalid path parameters",
          ),
        );
    }
    const { workspaceId, projectId } = paramsParsed.data;

    const bodyParsed = createChangeOrderSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            bodyParsed.error.issues[0]?.message || "Invalid request body",
          ),
        );
    }

    const result = await changeOrderService.createDraft(
      projectId,
      workspaceId,
      actorId,
      bodyParsed.data,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(201).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /workspaces/:workspaceId/projects/:projectId/change-orders
 * Lists all change orders for a project.
 */
export async function listChangeOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            paramsParsed.error.issues[0]?.message || "Invalid path parameters",
          ),
        );
    }
    const { workspaceId, projectId } = paramsParsed.data;

    const result = await changeOrderService.listByProject(
      projectId,
      workspaceId,
      actorId,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId
 * Retrieves a single change order by ID.
 */
export async function getChangeOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success || !paramsParsed.data.changeOrderId) {
      return res
        .status(400)
        .json(
          createError("VALIDATION_ERROR", "Invalid or missing change order ID"),
        );
    }
    const { workspaceId, projectId, changeOrderId } = paramsParsed.data;

    const result = await changeOrderService.getById(
      changeOrderId,
      projectId,
      workspaceId,
      actorId,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId
 * Updates an existing draft change order proposal.
 */
export async function updateChangeOrderDraft(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success || !paramsParsed.data.changeOrderId) {
      return res
        .status(400)
        .json(
          createError("VALIDATION_ERROR", "Invalid or missing change order ID"),
        );
    }
    const { workspaceId, projectId, changeOrderId } = paramsParsed.data;

    const bodyParsed = updateChangeOrderDraftSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            bodyParsed.error.issues[0]?.message || "Invalid request body",
          ),
        );
    }

    const result = await changeOrderService.updateDraft(
      changeOrderId,
      projectId,
      workspaceId,
      actorId,
      bodyParsed.data,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/approve
 * Approves a change order proposal, materializes deliverables, mutates project, and creates invoice.
 */
export async function approveChangeOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success || !paramsParsed.data.changeOrderId) {
      return res
        .status(400)
        .json(
          createError("VALIDATION_ERROR", "Invalid or missing change order ID"),
        );
    }
    const { workspaceId, projectId, changeOrderId } = paramsParsed.data;

    const bodyParsed = approveChangeOrderSchema.safeParse(req.body || {});
    if (!bodyParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            bodyParsed.error.issues[0]?.message || "Invalid request body",
          ),
        );
    }

    const result = await changeOrderService.approveChangeOrder(
      changeOrderId,
      projectId,
      workspaceId,
      actorId,
      bodyParsed.data,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/reject
 * Rejects a change order proposal.
 */
export async function rejectChangeOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success || !paramsParsed.data.changeOrderId) {
      return res
        .status(400)
        .json(
          createError("VALIDATION_ERROR", "Invalid or missing change order ID"),
        );
    }
    const { workspaceId, projectId, changeOrderId } = paramsParsed.data;

    const result = await changeOrderService.rejectChangeOrder(
      changeOrderId,
      projectId,
      workspaceId,
      actorId,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /workspaces/:workspaceId/projects/:projectId/change-orders/:changeOrderId/cancel
 * Cancels a draft change order proposal.
 */
export async function cancelChangeOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = getUserId(req);
    if (!actorId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const paramsParsed = changeOrderParamsSchema.safeParse(req.params);
    if (!paramsParsed.success || !paramsParsed.data.changeOrderId) {
      return res
        .status(400)
        .json(
          createError("VALIDATION_ERROR", "Invalid or missing change order ID"),
        );
    }
    const { workspaceId, projectId, changeOrderId } = paramsParsed.data;

    const result = await changeOrderService.cancelChangeOrder(
      changeOrderId,
      projectId,
      workspaceId,
      actorId,
    );

    if (!result.success) {
      return handleChangeOrderError(res, result.error);
    }

    return res.status(200).json(createSuccess(result.data));
  } catch (error) {
    return next(error);
  }
}
