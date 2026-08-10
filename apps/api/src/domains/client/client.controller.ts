import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import { WorkspaceMemberRepository } from "../workspace/repository";
import { NullClientEventEmitter } from "./client.events";
import { mapClientToResponse, mapClientsToResponse } from "./client.mapper";
import type { CreateClientRequest, UpdateClientRequest } from "./client.schema";
import { ClientService } from "./client.service";
import type {
  CreateClientServiceInput,
  UpdateClientServiceInput,
} from "./client.types";
import { ClientRepository } from "./repository/client.repository";

interface AuthRequest extends Request {
  user?: { id: string };
}

const clientService = new ClientService(
  new ClientRepository(),
  new WorkspaceMemberRepository(),
  new NullClientEventEmitter(),
);

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

export async function createClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const requestBody = req.body as CreateClientRequest;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const serviceInput: CreateClientServiceInput = { ...requestBody };
    const result = await clientService.createClient(
      serviceInput,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "CLIENT_VALIDATION_FAILED") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      if (result.error.code === "CLIENT_EMAIL_ALREADY_EXISTS") {
        return res
          .status(409)
          .json(createError("CONFLICT", result.error.message));
      }
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      console.error("[createClient] Unhandled service error:", result.error.code, result.error.message);
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientToResponse(result.data);
    return res.status(201).json(createSuccess(mapped));
  } catch (error) {
    console.error("Error in createClient handler:", error);
    next(error);
  }
}

export async function getClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await clientService.getClient(clientId, workspaceId, userId);

    if (!result.success) {
      if (result.error.code === "CLIENT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function listClients(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const { status, excludeDeleted, search } = req.query as {
      status?: "active" | "inactive" | "archived" | "all";
      excludeDeleted?: string;
      search?: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await clientService.listClients(workspaceId, userId, {
      status,
      excludeDeleted: excludeDeleted !== "false",
      search,
    });

    if (!result.success) {
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientsToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function updateClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };
    const requestBody = req.body as UpdateClientRequest;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const serviceInput: UpdateClientServiceInput = { ...requestBody };
    const result = await clientService.updateClient(
      clientId,
      workspaceId,
      serviceInput,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "CLIENT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "CLIENT_DELETED") {
        return res.status(410).json(createError("GONE", result.error.message));
      }
      if (result.error.code === "CLIENT_EMAIL_ALREADY_EXISTS") {
        return res
          .status(409)
          .json(createError("CONFLICT", result.error.message));
      }
      if (result.error.code === "CLIENT_VALIDATION_FAILED") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function deleteClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await clientService.deleteClient(
      clientId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "CLIENT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "CLIENT_DELETED") {
        return res.status(410).json(createError("GONE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function restoreClient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, clientId } = req.params as {
      workspaceId: string;
      clientId: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await clientService.restoreClient(
      clientId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "CLIENT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "CLIENT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "CLIENT_NOT_DELETED") {
        return res
          .status(400)
          .json(createError("INVALID_STATE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapClientToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}
