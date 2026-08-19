import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import {
  ActivityEventConsumer,
  InvoiceEventEmitterAdapter,
} from "../activity/activity.consumer";
import { ActivityRepository } from "../activity/repository/activity.repository";
import { ClientRepository } from "../client/repository/client.repository";
import { ProjectRepository } from "../project/repository/project.repository";
import { WorkspaceMemberRepository } from "../workspace/repository";
import { mapInvoiceToResponse, mapInvoicesToResponse } from "./invoice.mapper";
import type {
  CancelInvoiceInput,
  CreateInvoiceInput,
  InvoiceQueryParams,
  RecordPaymentInput,
  SendInvoiceInput,
  UpdateInvoiceInput,
} from "./invoice.schema";
import { InvoiceService } from "./invoice.service";
import { InvoiceRepository } from "./repository/invoice.repository";

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

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

export function handleDomainError(
  res: Response,
  error: { code: string; message: string },
) {
  switch (error.code) {
    case "INVOICE_NOT_FOUND":
      return res.status(404).json(createError("NOT_FOUND", error.message));
    case "INVOICE_PERMISSION_DENIED":
      return res.status(403).json(createError("FORBIDDEN", error.message));
    case "INVOICE_VALIDATION_FAILED":
      return res
        .status(400)
        .json(createError("VALIDATION_ERROR", error.message));
    case "INVOICE_IMMUTABLE":
    case "INVOICE_DRAFT_ONLY_DELETE":
    case "INVOICE_INVALID_STATUS_TRANSITION":
    case "INVOICE_NUMBER_ALREADY_EXISTS":
    case "INVOICE_CLIENT_MISMATCH":
    case "INVOICE_PROJECT_MISMATCH":
      return res.status(409).json(createError("CONFLICT", error.message));
    default:
      return res.status(500).json(createError(error.code, error.message));
  }
}

export async function createInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const requestBody = req.body as CreateInvoiceInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.createInvoice(
      requestBody,
      workspaceId,
      userId,
    );
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(201).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.getInvoice(id, workspaceId, userId);
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function listInvoices(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const query = req.query as InvoiceQueryParams;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.listInvoices(
      {
        workspaceId,
        clientId: query.clientId,
        projectId: query.projectId,
        status: query.status,
        search: query.search,
      },
      userId,
    );

    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoicesToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function updateInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const requestBody = req.body as UpdateInvoiceInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.updateInvoice(
      id,
      requestBody,
      workspaceId,
      userId,
    );
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function sendInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const requestBody = (req.body || {}) as SendInvoiceInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.sendInvoice(
      id,
      requestBody,
      workspaceId,
      userId,
    );
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const requestBody = req.body as RecordPaymentInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.recordPayment(
      id,
      requestBody,
      workspaceId,
      userId,
    );
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function cancelInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.cancelInvoice(id, workspaceId, userId);
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    const mapped = mapInvoiceToResponse(result.data);
    return res.status(200).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, id } = req.params as {
      workspaceId: string;
      id: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await invoiceService.deleteInvoice(id, workspaceId, userId);
    if (!result.success) {
      return handleDomainError(res, result.error);
    }

    return res
      .status(200)
      .json(createSuccess({ id: result.data.id, deleted: true }));
  } catch (error) {
    next(error);
  }
}
