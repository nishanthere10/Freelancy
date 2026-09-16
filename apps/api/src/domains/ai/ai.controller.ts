import type { NextFunction, Request, Response } from "express";
import { aiServiceClient } from "../../ai/client";
import type { AiRequestPayload } from "../../ai/types";
import { createError, createSuccess } from "../../utils/response";
import { WorkspaceMemberRepository } from "../workspace/repository";
import type {
  AnalyzeDriftInput,
  ConvertScopeToProjectInput,
  GenerateScopeInput,
  ListScopesQuery,
  RefineScopeInput,
  UpdateScopeResultInput,
} from "./ai.schema";
import { aiService } from "./ai.service";

interface AuthRequest extends Request {
  user?: { id: string };
  id?: string;
}

const workspaceMemberRepo = new WorkspaceMemberRepository();

/**
 * Controller to generate an AI Scope Analysis draft.
 */
export async function generateScopeAnalysis(
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

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    const { inputText, projectId } = req.body as GenerateScopeInput;
    const requestId =
      req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

    const scopeRecord = await aiService.generateScope({
      workspaceId,
      actorId: userId,
      actorRole: membership.role,
      inputText,
      projectId,
      requestId,
    });

    return res.status(200).json(createSuccess(scopeRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to confirm an existing AI Scope Analysis.
 */
export async function confirmScopeAnalysis(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeId } = req.params as {
      workspaceId: string;
      scopeId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    if (membership.role !== "owner" && membership.role !== "editor") {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "Only workspace owner or editor can confirm scope analysis",
          ),
        );
    }

    const confirmedRecord = await aiService.confirmScope({
      workspaceId,
      scopeId,
    });

    return res.status(200).json(createSuccess(confirmedRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to fetch a specific Scope Analysis by ID.
 */
export async function getScopeAnalysis(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeId } = req.params as {
      workspaceId: string;
      scopeId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    const scopeRecord = await aiService.getScope({
      workspaceId,
      scopeId,
    });

    return res.status(200).json(createSuccess(scopeRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to list Scope Analyses for a workspace.
 */
export async function listScopeAnalyses(
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

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    const query = req.query as unknown as ListScopesQuery;
    const projectId = query?.projectId;
    const limit = query?.limit;
    const offset = query?.offset;

    const scopes = await aiService.listScopes({
      workspaceId,
      projectId,
      limit,
      offset,
    });

    return res.status(200).json(createSuccess(scopes));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to test AI Gateway Bridge connectivity.
 */
export async function testAiBridge(
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

    // Verify workspace membership and get role
    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    const requestId =
      req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

    const payload: AiRequestPayload = {
      workspaceId,
      actorId: userId,
      actorRole: membership.role,
      requestId,
      input: req.body ?? {},
    };

    const aiResponse = await aiServiceClient.post("/api/v1/test", payload);

    return res.status(200).json(createSuccess(aiResponse));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to analyze scope drift from a client change request.
 */
export async function analyzeScopeDrift(
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

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    if (membership.role !== "owner" && membership.role !== "editor") {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "Only workspace owner or editor can perform drift analysis",
          ),
        );
    }

    const { changeRequestText, scopeAnalysisId } =
      req.body as AnalyzeDriftInput;
    const requestId =
      req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

    const driftRecord = await aiService.analyzeDrift({
      workspaceId,
      actorId: userId,
      actorRole: membership.role,
      changeRequestText,
      scopeAnalysisId,
      requestId,
    });

    return res.status(200).json(createSuccess(driftRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to list drift analyses for a confirmed scope analysis.
 */
export async function listScopeDriftAnalyses(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeAnalysisId } = req.params as {
      workspaceId: string;
      scopeAnalysisId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    const records = await aiService.listDriftsByScope({
      workspaceId,
      scopeAnalysisId,
    });

    return res.status(200).json(createSuccess(records));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to refine an existing AI Scope Analysis using conversational instructions.
 */
export async function refineScopeAnalysis(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeId } = req.params as {
      workspaceId: string;
      scopeId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    if (membership.role !== "owner" && membership.role !== "editor") {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "Only workspace owner or editor can refine scope analysis",
          ),
        );
    }

    const { revisionPrompt } = req.body as RefineScopeInput;
    const requestId =
      req.id || (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

    const refinedRecord = await aiService.refineScope({
      workspaceId,
      actorId: userId,
      actorRole: membership.role,
      scopeId,
      revisionPrompt,
      requestId,
    });

    return res.status(200).json(createSuccess(refinedRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to manually update an AI Scope Analysis deliverable details.
 */
export async function updateScopeAnalysisResult(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeId } = req.params as {
      workspaceId: string;
      scopeId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    if (membership.role !== "owner" && membership.role !== "editor") {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "Only workspace owner or editor can update scope analysis",
          ),
        );
    }

    const updatedRecord = await aiService.updateScopeResult({
      workspaceId,
      scopeId,
      result: req.body,
    });

    return res.status(200).json(createSuccess(updatedRecord));
  } catch (err: unknown) {
    return next(err);
  }
}

/**
 * Controller to convert a confirmed Scope Analysis into a live Project and optional Deposit Invoice.
 */
export async function convertScopeToProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { workspaceId, scopeId } = req.params as {
      workspaceId: string;
      scopeId: string;
    };
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json(createError("UNAUTHORIZED", "Authentication required"));
    }

    const membership = await workspaceMemberRepo.getByWorkspaceAndUser(
      workspaceId,
      userId,
    );
    if (!membership) {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "User is not a member of the specified workspace",
          ),
        );
    }

    if (membership.role !== "owner" && membership.role !== "editor") {
      return res
        .status(403)
        .json(
          createError(
            "FORBIDDEN",
            "Only workspace owner or editor can convert scope to project",
          ),
        );
    }

    const projectData = req.body as ConvertScopeToProjectInput;

    const result = await aiService.convertScopeToProject({
      workspaceId,
      actorId: userId,
      scopeId,
      projectData,
    });

    return res.status(201).json(createSuccess(result));
  } catch (err: unknown) {
    return next(err);
  }
}
