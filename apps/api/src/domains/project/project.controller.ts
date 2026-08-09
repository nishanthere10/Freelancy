import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import { ClientRepository } from "../client/repository/client.repository";
import { WorkspaceMemberRepository } from "../workspace/repository";
import { NullProjectEventEmitter } from "./project.events";
import { mapProjectsToResponse, mapProjectToResponse } from "./project.mapper";
import type {
  ChangeProjectStatusRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "./project.schema";
import { ProjectService } from "./project.service";
import type {
  CreateProjectServiceInput,
  UpdateProjectServiceInput,
} from "./project.types";
import { ProjectRepository } from "./repository/project.repository";

interface AuthRequest extends Request {
  user?: { id: string };
}

const projectService = new ProjectService(
  new ProjectRepository(),
  new WorkspaceMemberRepository(),
  new ClientRepository(),
  new NullProjectEventEmitter(),
);

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

export async function createProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const requestBody = req.body as CreateProjectRequest;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const serviceInput: CreateProjectServiceInput = { ...requestBody };
    const result = await projectService.createProject(
      serviceInput,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "CLIENT_WORKSPACE_MISMATCH") {
        return res
          .status(400)
          .json(createError("CLIENT_WORKSPACE_MISMATCH", result.error.message));
      }
      if (result.error.code === "PROJECT_VALIDATION_FAILED") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      if (result.error.code === "PROJECT_SLUG_ALREADY_EXISTS") {
        return res
          .status(409)
          .json(createError("CONFLICT", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      console.error("createProject internal failure:", result.error);
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.status(201).json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function getProject(
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

    const result = await projectService.getProject(
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "PROJECT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function listProjects(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const { status, clientId, excludeDeleted, search } = req.query as {
      status?: "draft" | "active" | "completed" | "archived" | "all";
      clientId?: string;
      excludeDeleted?: string;
      search?: string;
    };
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await projectService.listProjects(workspaceId, userId, {
      status,
      clientId,
      excludeDeleted: excludeDeleted !== "false",
      search,
    });

    if (!result.success) {
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectsToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function updateProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const requestBody = req.body as UpdateProjectRequest;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const serviceInput: UpdateProjectServiceInput = { ...requestBody };
    const result = await projectService.updateProject(
      projectId,
      workspaceId,
      serviceInput,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "PROJECT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "CLIENT_WORKSPACE_MISMATCH") {
        return res
          .status(400)
          .json(createError("CLIENT_WORKSPACE_MISMATCH", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "PROJECT_DELETED") {
        return res.status(410).json(createError("GONE", result.error.message));
      }
      if (result.error.code === "PROJECT_SLUG_ALREADY_EXISTS") {
        return res
          .status(409)
          .json(createError("CONFLICT", result.error.message));
      }
      if (result.error.code === "PROJECT_VALIDATION_FAILED") {
        return res
          .status(400)
          .json(createError("VALIDATION_ERROR", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function changeProjectStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, projectId } = req.params as {
      workspaceId: string;
      projectId: string;
    };
    const { status } = req.body as ChangeProjectStatusRequest;
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const result = await projectService.changeProjectStatus(
      projectId,
      workspaceId,
      { status },
      userId,
    );

    if (!result.success) {
      if (result.error.code === "PROJECT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "PROJECT_DELETED") {
        return res.status(410).json(createError("GONE", result.error.message));
      }
      if (result.error.code === "PROJECT_INVALID_STATUS_TRANSITION") {
        return res
          .status(400)
          .json(createError("INVALID_TRANSITION", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(
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

    const result = await projectService.deleteProject(
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "PROJECT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "PROJECT_DELETED") {
        return res.status(410).json(createError("GONE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}

export async function restoreProject(
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

    const result = await projectService.restoreProject(
      projectId,
      workspaceId,
      userId,
    );

    if (!result.success) {
      if (result.error.code === "PROJECT_NOT_FOUND") {
        return res
          .status(404)
          .json(createError("NOT_FOUND", result.error.message));
      }
      if (result.error.code === "PROJECT_PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      if (result.error.code === "PROJECT_NOT_DELETED") {
        return res
          .status(400)
          .json(createError("INVALID_STATE", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapProjectToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}
