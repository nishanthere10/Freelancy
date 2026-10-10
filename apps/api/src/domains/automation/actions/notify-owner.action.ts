import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../../config";
import { createError, createSuccess } from "../../../utils/response";
import { CommunicationService } from "../../communication/communication.service";
import { AutomationIdempotencyService } from "../automation.idempotency";
import { resolveActionContact } from "./recipient.resolver";

const idempotencyService = new AutomationIdempotencyService();
const communicationService = new CommunicationService();

export async function notifyOwnerAction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    const {
      automationId,
      actionIndex,
      actionPayload,
      workspaceId,
      eventId,
      definitionVersion,
      automationRunId,
    } = req.body;

    if (!automationId || actionIndex === undefined || !workspaceId || !eventId) {
      res
        .status(400)
        .json(createError("BAD_REQUEST", "Missing required fields"));
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(
      workspaceId,
      automationId,
      eventId,
      actionIndex,
      definitionVersion || 1,
    );

    const existing = await idempotencyService.getExistingActionRun(
      workspaceId,
      idempotencyKey,
    );
    if (existing && existing.status === "succeeded") {
      res.status(200).json(createSuccess({ status: "already_completed" }));
      return;
    }

    const runId = automationRunId || "00000000-0000-0000-0000-000000000000";
    await idempotencyService.recordActionStart(
      workspaceId,
      runId,
      actionIndex,
      "notify_owner",
      idempotencyKey,
    );

    try {
      const resolved = await resolveActionContact(workspaceId, eventId, {
        recipient: "owner",
        templateVariables: actionPayload.templateVariables,
      });

      if (!resolved.recipientEmail) {
        throw new Error("No owner email found to notify");
      }

      const message = await communicationService.sendEmail({
        workspaceId,
        actorId: "automation-service",
        recipientEmail: resolved.recipientEmail,
        templateKey: actionPayload.templateKey || "project.progress",
        templateVariables: {
          ...resolved.templateVariables,
          customMessage: actionPayload.messageTemplate || "Automation notice",
        },
        idempotencyKey: `notify-${idempotencyKey}`,
      });

      await idempotencyService.recordActionResult(
        workspaceId,
        idempotencyKey,
        "succeeded",
        message.id,
      );
      res
        .status(200)
        .json(createSuccess({ status: "notified", messageId: message.id }));
    } catch (err: any) {
      await idempotencyService.recordActionResult(
        workspaceId,
        idempotencyKey,
        "failed",
        undefined,
        "NOTIFICATION_FAILED",
        err.message,
      );
      res.status(502).json(createError("NOTIFICATION_FAILED", err.message));
    }
  } catch (err) {
    next(err);
  }
}
