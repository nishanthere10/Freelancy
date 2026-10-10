import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../../config";
import { createError, createSuccess } from "../../../utils/response";
import { ActivityEventConsumer } from "../../activity/activity.consumer";
import { ActivityRepository } from "../../activity/repository/activity.repository";
import { AutomationIdempotencyService } from "../automation.idempotency";

const idempotencyService = new AutomationIdempotencyService();
const activityConsumer = new ActivityEventConsumer(new ActivityRepository());

export async function createFollowUpAction(
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
      "create_follow_up",
      idempotencyKey,
    );

    try {
      await activityConsumer.ingest({
        workspaceId,
        actorUserId: null,
        eventType: "automation.follow_up_created",
        entityType: "automation",
        entityId: automationId,
        metadata: {
          followUpTitle: actionPayload.title || "Follow-up task",
          sourceEventId: eventId,
          automationId,
          automationRunId: runId,
        },
      });

      await idempotencyService.recordActionResult(
        workspaceId,
        idempotencyKey,
        "succeeded",
      );
      res.status(200).json(createSuccess({ status: "created" }));
    } catch (err: any) {
      await idempotencyService.recordActionResult(
        workspaceId,
        idempotencyKey,
        "failed",
        undefined,
        "FOLLOW_UP_FAILED",
        err.message,
      );
      res.status(502).json(createError("FOLLOW_UP_FAILED", err.message));
    }
  } catch (err) {
    next(err);
  }
}
