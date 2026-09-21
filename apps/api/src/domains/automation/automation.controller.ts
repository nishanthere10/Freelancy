import type { NextFunction, Request, Response } from "express";
import { createError, createSuccess } from "../../utils/response";
import { AutomationService } from "./automation.service";
import { AutomationRepository } from "./automation.repository";
import {
  CreateAutomationSchema,
  UpdateAutomationSchema,
} from "./automation.schema";

const automationRepository = new AutomationRepository();
const automationService = new AutomationService(automationRepository);

interface AuthRequest extends Request {
  user?: { id: string };
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

/**
 * GET /api/v1/workspaces/:workspaceId/automations
 */
export async function listAutomations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const automations = await automationService.listAutomations(workspaceId);
    res.status(200).json(createSuccess(automations));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/automations/:automationId
 */
export async function getAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };
    const automation = await automationService.getAutomation(
      workspaceId,
      automationId
    );
    res.status(200).json(createSuccess(automation));
  } catch (err) {
    res.status(404).json(createError("NOT_FOUND", "Automation not found"));
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/automations
 */
export async function createAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params as { workspaceId: string };
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json(createError("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const parsed = CreateAutomationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(createError("VALIDATION_ERROR", parsed.error.message));
      return;
    }

    const automation = await automationService.createAutomation({
      workspaceId,
      createdByUserId: userId,
      ...parsed.data,
    });
    res.status(201).json(createSuccess(automation));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/workspaces/:workspaceId/automations/:automationId
 */
export async function updateAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };

    const parsed = UpdateAutomationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(createError("VALIDATION_ERROR", parsed.error.message));
      return;
    }

    const updated = await automationService.updateAutomation(
      workspaceId,
      automationId,
      parsed.data
    );
    res.status(200).json(createSuccess(updated));
  } catch (err) {
    res.status(404).json(createError("NOT_FOUND", "Automation not found"));
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/automations/:automationId/activate
 */
export async function activateAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };

    const automation = await automationService.activateAutomation(
      workspaceId,
      automationId
    );
    res.status(200).json(createSuccess(automation));
  } catch (err) {
    res.status(400).json(createError("ACTIVATION_ERROR", (err as Error).message));
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/automations/:automationId/pause
 */
export async function pauseAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };

    const automation = await automationService.pauseAutomation(
      workspaceId,
      automationId
    );
    res.status(200).json(createSuccess(automation));
  } catch (err) {
    res.status(400).json(createError("PAUSE_ERROR", (err as Error).message));
  }
}

/**
 * GET /api/v1/workspaces/:workspaceId/automations/:automationId/runs
 */
export async function listRuns(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };
    const runs = await automationService.getRuns(workspaceId, automationId);
    res.status(200).json(createSuccess(runs));
  } catch (err) {
    res.status(404).json(createError("NOT_FOUND", "Automation not found"));
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/automations/:automationId/archive
 */
export async function archiveAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };
    const automation = await automationService.archiveAutomation(workspaceId, automationId);
    res.status(200).json(createSuccess(automation));
  } catch (err) {
    res.status(400).json(createError("ARCHIVE_ERROR", (err as Error).message));
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/automations/:automationId/test
 */
export async function testAutomation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Dry run
  try {
    const { workspaceId, automationId } = req.params as {
      workspaceId: string;
      automationId: string;
    };
    const automation = await automationService.getAutomation(workspaceId, automationId);
    
    // Simulate compilation and dry-run execution
    const dryRunResult = {
      triggerMatched: true,
      conditionsMatched: true,
      actions: (automation.actionConfig as any[]).map(a => ({
        type: a.type,
        wouldExecute: true
      }))
    };
    
    res.status(200).json(createSuccess(dryRunResult));
  } catch (err) {
    res.status(404).json(createError("NOT_FOUND", "Automation not found"));
  }
}
