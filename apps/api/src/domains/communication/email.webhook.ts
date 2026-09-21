/**
 * Email (Resend) Webhook Handler
 *
 * Responsible for:
 * 1. Accepting POST webhook deliveries from Resend
 * 2. Verifying and parsing via the EmailProvider interface
 * 3. Deduplicating via (provider, provider_event_id)
 * 4. Updating outbound message status (delivered / bounced / failed / opened)
 *
 * Route: POST /webhooks/email
 * Auth:  No user auth — Resend calls this endpoint.
 *        In production, RESEND_WEBHOOK_SECRET is used (svix HMAC).
 *        In dev, the secret is empty and we skip HMAC, only validating JSON shape.
 */

import type { Request, Response } from "express";
import {
  communicationEventsTable,
  communicationMessagesTable,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { logger } from "../../utils/logger";
import type { CommunicationProviderType } from "./communication.types";
import { ResendEmailProvider } from "./providers/email/resend.provider";

// ---------------------------------------------------------------------------
// Provider singleton
// ---------------------------------------------------------------------------

const emailProvider = new ResendEmailProvider();

// ---------------------------------------------------------------------------
// Status normalisation — map Resend event types → our enum values
// ---------------------------------------------------------------------------

type EmailStatusUpdate = "delivered" | "bounced" | "failed";

function mapResendEventToStatus(
  eventType: string,
): EmailStatusUpdate | null {
  if (eventType === "email.delivered") return "delivered";
  if (eventType === "email.bounced") return "bounced";
  if (eventType === "email.complained") return "failed";
  return null;
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export async function handleEmailWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const rawBody =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = value;
  }

  const verified = await emailProvider.verifyWebhook(rawBody, headers);

  if (!verified.valid || !verified.event) {
    logger.warn("Email webhook: invalid or unrecognised payload", {
      error: verified.error,
    });
    res.status(200).json({ received: false, reason: "invalid_payload" });
    return;
  }

  const { event } = verified;
  const provider: CommunicationProviderType = "resend";

  // Deduplicate
  const alreadyProcessed = await db
    .select({ id: communicationEventsTable.id })
    .from(communicationEventsTable)
    .where(
      and(
        eq(communicationEventsTable.provider, provider),
        eq(communicationEventsTable.providerEventId, event.eventId),
      ),
    )
    .limit(1);

  if (alreadyProcessed.length > 0) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // Resolve linked message
  let workspaceId: string | null = null;
  let linkedMessageId: string | null = null;

  if (event.providerMessageId) {
    const [existingMessage] = await db
      .select({
        id: communicationMessagesTable.id,
        workspaceId: communicationMessagesTable.workspaceId,
      })
      .from(communicationMessagesTable)
      .where(
        eq(
          communicationMessagesTable.providerMessageId,
          event.providerMessageId,
        ),
      )
      .limit(1);

    if (existingMessage) {
      workspaceId = existingMessage.workspaceId;
      linkedMessageId = existingMessage.id;
    }
  }

  if (!workspaceId) {
    logger.warn("Email webhook: could not resolve workspace for event", {
      eventId: event.eventId,
      eventType: event.eventType,
    });
    res.status(200).json({ received: true, workspace_resolved: false });
    return;
  }

  // Persist raw event
  await db.insert(communicationEventsTable).values({
    workspaceId,
    messageId: linkedMessageId ?? undefined,
    provider,
    providerEventId: event.eventId,
    eventType: event.eventType,
    payload: event.rawPayload,
    occurredAt: event.occurredAt ?? new Date(),
  });

  // Update message status
  const statusUpdate = mapResendEventToStatus(event.eventType);
  if (linkedMessageId && statusUpdate) {
    // Single UPDATE — status + timestamp in one round-trip
    await db
      .update(communicationMessagesTable)
      .set({
        status: statusUpdate as "delivered" | "bounced" | "failed",
        updatedAt: new Date(),
        deliveredAt: statusUpdate === "delivered" ? new Date() : undefined,
      })
      .where(eq(communicationMessagesTable.id, linkedMessageId));

    logger.info("Email webhook: updated message status", {
      messageId: linkedMessageId,
      messageStatus: statusUpdate,
    });
  }

  res.status(200).json({ received: true });
}
