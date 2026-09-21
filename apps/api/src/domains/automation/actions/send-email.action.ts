import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { createError, createSuccess } from "../../../utils/response";
import { config } from "../../../config";
import { AutomationIdempotencyService } from "../automation.idempotency";
import { CommunicationService } from "../../communication/communication.service";

const idempotencyService = new AutomationIdempotencyService();
const communicationService = new CommunicationService();

export async function sendEmailAction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || "";
    const expectedHeader = `Bearer ${config.n8nWebhookSecret}`;
    
    // Use timing-safe equal to prevent timing attacks
    const isLengthMatch = authHeader.length === expectedHeader.length;
    const safeAuthHeader = isLengthMatch ? authHeader : expectedHeader;
    
    if (!crypto.timingSafeEqual(Buffer.from(safeAuthHeader), Buffer.from(expectedHeader)) || !isLengthMatch) {
      res.status(401).json(createError("UNAUTHORIZED", "Invalid service token"));
      return;
    }

    const { automationId, actionIndex, actionPayload, workspaceId, eventId, definitionVersion } =
      req.body;

    // Validate requirements
    if (!automationId || actionIndex === undefined || !workspaceId || !eventId) {
      res.status(400).json(createError("BAD_REQUEST", "Missing required fields"));
      return;
    }

    // Generate Idempotency Key
    const idempotencyKey = idempotencyService.generateKey(
      workspaceId,
      automationId,
      eventId,
      actionIndex,
      definitionVersion || 1
    );

    // Check Idempotency
    const existing = await idempotencyService.getExistingActionRun(workspaceId, idempotencyKey);
    if (existing && existing.status === "succeeded") {
      res.status(200).json(createSuccess({ status: "already_completed" }));
      return;
    }

    // Mock Automation Run ID for now 
    const mockRunId = "00000000-0000-0000-0000-000000000000"; // Should be passed by caller

    await idempotencyService.recordActionStart(
      workspaceId,
      mockRunId,
      actionIndex,
      actionPayload.type,
      idempotencyKey
    );

    try {
      // 1. Resolve Recipient & Template from Freelancy Context
      // (Simplified logic for demonstration)
      const message = await communicationService.sendEmail({
        workspaceId,
        actorId: "automation-service",
        clientId: actionPayload.clientId || "00000000-0000-0000-0000-000000000000",
        recipientEmail: actionPayload.recipient === "owner" ? "owner@example.com" : "client@example.com",
        templateKey: actionPayload.templateKey,
        templateVariables: {},
        idempotencyKey: `email-${idempotencyKey}`, 
      });

      await idempotencyService.recordActionResult(workspaceId, idempotencyKey, "succeeded", message.id);
      res.status(200).json(createSuccess({ status: "sent", messageId: message.id }));
    } catch (err: any) {
      await idempotencyService.recordActionResult(workspaceId, idempotencyKey, "failed", undefined, "DELIVERY_FAILED", err.message);
      res.status(502).json(createError("DELIVERY_FAILED", err.message));
    }
  } catch (err) {
    next(err);
  }
}
