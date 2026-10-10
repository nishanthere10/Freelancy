import type { NextFunction, Response } from "express";
import type { WorkspaceMember, WorkspaceRole } from "@repo/database";
import { createError } from "../utils/response";
import { WorkspaceMemberRepository } from "../domains/workspace/repository";
import type { AuthenticatedRequest } from "./auth.middleware";

export interface WorkspaceAuthRequest extends AuthenticatedRequest {
  workspaceMember?: WorkspaceMember;
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

const memberRepo = new WorkspaceMemberRepository();

/**
 * Enforces workspace membership and minimum role requirement (owner > editor > viewer).
 * Rejects with 401 if unauthenticated, 403 if not a member or role is insufficient.
 */
export function requireWorkspaceRole(minRole: WorkspaceRole = "viewer") {
  return async (req: WorkspaceAuthRequest, res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.workspaceId as string | undefined;
      const userId = req.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json(createError("UNAUTHORIZED", "Authentication required"));
      }

      if (!workspaceId) {
        return res
          .status(400)
          .json(createError("BAD_REQUEST", "Workspace ID is required"));
      }

      const member = await memberRepo.getByWorkspaceAndUser(workspaceId, userId);

      if (!member) {
        return res
          .status(403)
          .json(
            createError(
              "FORBIDDEN",
              "You are not a member of this workspace",
              { code: "NOT_A_MEMBER" },
            ),
          );
      }

      if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
        return res
          .status(403)
          .json(
            createError(
              "FORBIDDEN",
              `Role '${member.role}' has insufficient permissions; '${minRole}' required`,
              {
                code: "INSUFFICIENT_ROLE",
                requiredRole: minRole,
                userRole: member.role,
              },
            ),
          );
      }

      req.workspaceMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
}
