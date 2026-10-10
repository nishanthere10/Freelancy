import { Router } from "express";
import {
  activateAutomation,
  archiveAutomation,
  createAutomation,
  getAutomation,
  listAutomations,
  listRuns,
  pauseAutomation,
  testAutomation,
  updateAutomation,
} from "./automation.controller";

import { requireWorkspaceRole } from "../../middleware/rbac.middleware";

export const automationRouter: Router = Router({ mergeParams: true });

// Mounted at: /api/v1/workspaces/:workspaceId/automations

automationRouter.get("/", requireWorkspaceRole("viewer"), listAutomations);
automationRouter.post("/", requireWorkspaceRole("editor"), createAutomation);
automationRouter.get("/:automationId", requireWorkspaceRole("viewer"), getAutomation);
automationRouter.patch("/:automationId", requireWorkspaceRole("editor"), updateAutomation);
automationRouter.post("/:automationId/activate", requireWorkspaceRole("editor"), activateAutomation);
automationRouter.post("/:automationId/pause", requireWorkspaceRole("editor"), pauseAutomation);
automationRouter.post("/:automationId/archive", requireWorkspaceRole("editor"), archiveAutomation);
automationRouter.post("/:automationId/test", requireWorkspaceRole("editor"), testAutomation);
automationRouter.get("/:automationId/runs", requireWorkspaceRole("viewer"), listRuns);

// Actions Router (Internal)
import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../config";
import { createError } from "../../utils/response";
import { sendEmailAction } from "./actions/send-email.action";
import { sendWhatsAppAction } from "./actions/send-whatsapp.action";
import { notifyOwnerAction } from "./actions/notify-owner.action";
import { createFollowUpAction } from "./actions/create-follow-up.action";

export function verifyInternalActionAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization || "";
    const expectedHeader = `Bearer ${config.n8nWebhookSecret}`;

    const isLengthMatch = authHeader.length === expectedHeader.length;
    const safeAuthHeader = isLengthMatch ? authHeader : expectedHeader;

    if (
      !crypto.timingSafeEqual(
        Buffer.from(safeAuthHeader),
        Buffer.from(expectedHeader),
      ) ||
      !isLengthMatch
    ) {
      res.status(401).json(createError("UNAUTHORIZED", "Invalid service token"));
      return;
    }

    const timestampHeader = req.headers["x-action-timestamp"];
    if (timestampHeader) {
      const timestampMs =
        typeof timestampHeader === "string" && !isNaN(Number(timestampHeader))
          ? Number(timestampHeader)
          : Date.parse(String(timestampHeader));

      if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 300_000) {
        res
          .status(401)
          .json(createError("UNAUTHORIZED", "Action timestamp out of tolerance"));
        return;
      }
    }

    next();
  } catch {
    res.status(401).json(createError("UNAUTHORIZED", "Unauthorized service request"));
  }
}

export const automationInternalActionsRouter: Router = Router({ mergeParams: true });

automationInternalActionsRouter.use(verifyInternalActionAuth);
automationInternalActionsRouter.post("/send-email", sendEmailAction);
automationInternalActionsRouter.post("/send-whatsapp", sendWhatsAppAction);
automationInternalActionsRouter.post("/notify-owner", notifyOwnerAction);
automationInternalActionsRouter.post("/create-follow-up", createFollowUpAction);
