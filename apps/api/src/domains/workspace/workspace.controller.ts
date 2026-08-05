/**
 * Workspace HTTP controller
 * Thin layer: receives request → calls service → maps response
 */

import { createError, createSuccess } from "@/utils/response";
import type { NextFunction, Request, Response } from "express";
import { WorkspaceMemberRepository } from "./repository";
import { WorkspaceRepository } from "./repository";
import { NullWorkspaceEventEmitter } from "./workspace.events";
import {
  mapMembershipsToResponse,
  mapWorkspaceToResponse,
} from "./workspace.mapper";
import { WorkspaceService } from "./workspace.service";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "./workspace.types";

interface AuthRequest extends Request {
  user?: { id: string };
}

/**
 * Service instance (TODO: inject via DI container in production)
 */
const workspaceService = new WorkspaceService(
  new WorkspaceRepository(),
  new WorkspaceMemberRepository(),
  new NullWorkspaceEventEmitter(),
);

/**
 * Extract authenticated user ID from request
 */
function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

export async function listWorkspaces(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.listUserWorkspaces(userId);
    if (!result.success) {
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapMembershipsToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function getWorkspace(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.getWorkspace(id, userId);
    if (!result.success) {
      if (result.error.code === "WORKSPACE_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapWorkspaceToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = req.body as CreateWorkspaceInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.createWorkspace(data, userId);
    if (!result.success) {
      if (result.error.code === "VALIDATION_ERROR") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      if (result.error.code === "WORKSPACE_ALREADY_EXISTS") {
        return res
          .status(409)
          .json(createError("CONFLICT", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapWorkspaceToResponse(result.data);
    return res.status(201).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as { id: string };
    const data = req.body as UpdateWorkspaceInput;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.updateWorkspace(id, data, userId);
    if (!result.success) {
      if (result.error.code === "WORKSPACE_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "WORKSPACE_DELETED") {
        return res
          .status(410)
          .json(createError("GONE", result.error.message));
      }
      if (result.error.code === "VALIDATION_ERROR") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapWorkspaceToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspace(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.deleteWorkspace(id, userId);
    if (!result.success) {
      if (result.error.code === "WORKSPACE_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "WORKSPACE_DELETED") {
        return res
          .status(410)
          .json(createError("GONE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapWorkspaceToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function restoreWorkspace(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }
    const result = await workspaceService.restoreWorkspace(id, userId);
    if (!result.success) {
      if (result.error.code === "WORKSPACE_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "WORKSPACE_NOT_DELETED") {
        return res
          .status(400)
          .json(createError("INVALID_STATE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }
    const mapped = mapWorkspaceToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}
