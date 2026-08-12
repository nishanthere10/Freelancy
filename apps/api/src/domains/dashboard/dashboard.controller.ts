import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import { WorkspaceMemberRepository } from "../workspace/repository";
import { mapDashboardToResponse } from "./dashboard.mapper";
import { DashboardRepository } from "./dashboard.repository";
import { getDashboardSchema } from "./dashboard.schema";
import { DashboardService } from "./dashboard.service";

interface AuthRequest extends Request {
  user?: { id: string };
}

const dashboardService = new DashboardService(
  new DashboardRepository(),
  new WorkspaceMemberRepository(),
);

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

export async function getDashboard(
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

    const parseResult = getDashboardSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res
        .status(400)
        .json(
          createError(
            "VALIDATION_ERROR",
            parseResult.error.errors[0]?.message || "Invalid workspace ID",
          ),
        );
    }

    const { workspaceId } = parseResult.data;
    const result = await dashboardService.getDashboardData(workspaceId, userId);

    if (!result.success) {
      if (result.error.code === "PERMISSION_DENIED") {
        return res
          .status(403)
          .json(createError("FORBIDDEN", result.error.message));
      }
      return res
        .status(500)
        .json(createError(result.error.code, result.error.message));
    }

    const mapped = mapDashboardToResponse(result.data);
    return res.json(createSuccess(mapped));
  } catch (error) {
    next(error);
  }
}
