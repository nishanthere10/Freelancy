import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import { WorkspaceMemberRepository } from "../workspace/repository";
import { activityQuerySchema } from "./activity.schema";
import { ActivityService } from "./activity.service";
import type { ActivityQueryFilters } from "./activity.types";
import { ActivityRepository } from "./repository/activity.repository";

interface AuthRequest extends Request {
  user?: { id: string };
}

const activityRepo = new ActivityRepository();
const memberRepo = new WorkspaceMemberRepository();
const activityService = new ActivityService(activityRepo, memberRepo);

export async function listActivity(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    if (!workspaceId) {
      return res
        .status(400)
        .json(createError("VALIDATION_ERROR", "Workspace ID is required"));
    }

    const queryParsed = activityQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            "Invalid query parameters",
            queryParsed.error.flatten().fieldErrors,
          ),
        );
    }

    const filters: ActivityQueryFilters = {
      limit: queryParsed.data.limit,
      cursor: queryParsed.data.cursor,
      entityType: queryParsed.data.entityType,
      entityId: queryParsed.data.entityId,
      actorUserId: queryParsed.data.actorUserId,
    };

    const result = await activityService.listWorkspaceActivity(
      workspaceId,
      userId,
      filters,
    );

    if (!result.success) {
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError(result.error.code, result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    return res.json(createSuccess(result.data));
  } catch (error) {
    next(error);
  }
}
