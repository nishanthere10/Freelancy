/**
 * WhatsApp Webhook Handler
 *
 * Responsible for:
 * 1. Accepting raw POST bodies from WA-AKG (self-hosted Baileys gateway)
 * 2. Verifying and parsing the payload via the WhatsAppProvider interface
 * 3. Deduplicating events using (provider, provider_event_id) unique constraint
 * 4. Updating message delivery status (delivered / read) on outbound records
 * 5. Creating inbound message records for client replies
 *
 * Route: POST /webhooks/whatsapp
 * Auth:  None — webhook is called by the gateway, not end-users.
 *        Network-level security (private subnet / firewall) is the primary
 *        control; we also validate payload shape to reject garbage.
 */

import type { Request, Response } from "express";
import {
  clientsTable,
  communicationChannelsTable,
  communicationEventsTable,
  communicationMessagesTable,
} from "@repo/database";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { logger } from "../../utils/logger";
import type { CommunicationProviderType } from "./communication.types";
import { WaAkgWhatsAppProvider } from "./providers/whatsapp/wa-akg.provider";

// ---------------------------------------------------------------------------
// Provider singleton — instantiated once per worker/process
// ---------------------------------------------------------------------------

const whatsappProvider = new WaAkgWhatsAppProvider();

// ---------------------------------------------------------------------------
// Status normalisation — map WA-AKG event strings → our enum values
// ---------------------------------------------------------------------------

type MessageStatusUpdate = "delivered" | "read" | "failed";

function mapEventToStatus(
  eventType: string,
): MessageStatusUpdate | null {
  const statusMap: Record<string, MessageStatusUpdate> = {
    "message.delivered": "delivered",
    "message.read": "read",
    "message.failed": "failed",
  };
  return statusMap[eventType] ?? null;
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export async function handleWhatsAppWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  // 1. Read raw body (Express populates req.body when express.json() runs).
  //    We re-serialise to raw JSON so the provider can parse it consistently.
  const rawBody =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = value;
  }

  // 2. Parse and verify via the provider
  const verified = await whatsappProvider.verifyWebhook(rawBody, headers);

  if (!verified.valid || !verified.event) {
    logger.warn("WhatsApp webhook: invalid or unrecognised payload", {
      error: verified.error,
    });
    // Return 200 to prevent WA-AKG from retrying a permanently bad payload
    res.status(200).json({ received: false, reason: "invalid_payload" });
    return;
  }

  const { event } = verified;
  const provider: CommunicationProviderType = "wa_akg";

  // 3. Deduplicate via unique constraint on (provider, provider_event_id)
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
    logger.info("WhatsApp webhook: duplicate event, skipping", {
      eventId: event.eventId,
      eventType: event.eventType,
    });
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // 4. Determine workspace context.
  //    For outbound status events, look up the original message to get workspace_id.
  //    For inbound messages, we don't know which workspace the sender belongs to
  //    without a phone-number → channel lookup (handled below).

  let workspaceId: string | null = null;
  let linkedMessageId: string | null = null;
  let matchedClientId: string | null = null;

  if (event.providerMessageId) {
    const [existingMessage] = await db
      .select({
        id: communicationMessagesTable.id,
        workspaceId: communicationMessagesTable.workspaceId,
        clientId: communicationMessagesTable.clientId,
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
      matchedClientId = existingMessage.clientId;
    }
  }

  // If not resolved from an existing outbound message (e.g. Inbound message from client),
  // match sender's phone number against clientsTable
  if (!workspaceId && event.senderAddress) {
    const cleanNumber = event.senderAddress.replace(/^\+/, "");
    const [clientMatch] = await db
      .select({
        id: clientsTable.id,
        workspaceId: clientsTable.workspaceId,
      })
      .from(clientsTable)
      .where(
        or(
          eq(clientsTable.phone, event.senderAddress),
          eq(clientsTable.phone, cleanNumber),
          eq(clientsTable.phone, `+${cleanNumber}`),
        ),
      )
      .limit(1);

    if (clientMatch) {
      workspaceId = clientMatch.workspaceId;
      matchedClientId = clientMatch.id;
    }
  }

  // Fallback: If still not resolved, route to the workspace with the active WhatsApp channel
  if (!workspaceId) {
    const [channel] = await db
      .select({ workspaceId: communicationChannelsTable.workspaceId })
      .from(communicationChannelsTable)
      .where(
        and(
          eq(communicationChannelsTable.channel, "whatsapp"),
          eq(communicationChannelsTable.status, "active"),
        ),
      )
      .limit(1);

    if (channel) {
      workspaceId = channel.workspaceId;
    }
  }

  // 5. Persist raw event (idempotent write)
  if (!workspaceId) {
    // We can't persist to communication_events without workspace_id due to FK.
    // Log and acknowledge — the gateway retrying won't help here.
    logger.warn("WhatsApp webhook: could not resolve workspace for event", {
      eventId: event.eventId,
      eventType: event.eventType,
      senderAddress: event.senderAddress,
    });
    res.status(200).json({ received: true, workspace_resolved: false });
    return;
  }

  await db.insert(communicationEventsTable).values({
    workspaceId,
    messageId: linkedMessageId ?? undefined,
    provider,
    providerEventId: event.eventId,
    eventType: event.eventType,
    payload: event.rawPayload,
    occurredAt: event.occurredAt ?? new Date(),
  });

  // 6. Handle delivery status updates (outbound message lifecycle)
  const statusUpdate = mapEventToStatus(event.eventType);
  if (linkedMessageId && statusUpdate) {
    // Collapse status + timestamp into a single UPDATE to avoid a TOCTOU gap
    // between two round-trips.
    await db
      .update(communicationMessagesTable)
      .set({
        status: statusUpdate as "delivered" | "read" | "failed",
        updatedAt: new Date(),
        deliveredAt:
          statusUpdate === "delivered" || statusUpdate === "read"
            ? new Date()
            : undefined,
        readAt: statusUpdate === "read" ? new Date() : undefined,
      })
      .where(eq(communicationMessagesTable.id, linkedMessageId));

    logger.info("WhatsApp webhook: updated message status", {
      messageId: linkedMessageId,
      messageStatus: statusUpdate,
    });
  }

  // 7. Handle inbound messages (client reply)
  if (event.eventType === "message.received" && event.senderAddress) {
    // Resolve this workspace's own sender identity from the channel config
    // so recipientAddress is our number, not the client's.
    const [waChannel] = await db
      .select({ senderIdentity: communicationChannelsTable.senderIdentity })
      .from(communicationChannelsTable)
      .where(
        and(
          eq(communicationChannelsTable.workspaceId, workspaceId),
          eq(communicationChannelsTable.channel, "whatsapp"),
        ),
      )
      .limit(1);

    await db
      .insert(communicationMessagesTable)
      .values({
        workspaceId,
        clientId: matchedClientId ?? undefined,
        channel: "whatsapp",
        direction: "inbound",
        provider,
        providerMessageId: event.providerMessageId,
        senderAddress: event.senderAddress,
        // Use the workspace's own WhatsApp number as recipient; fall back to a
        // descriptive placeholder if the channel isn't configured yet.
        recipientAddress: waChannel?.senderIdentity ?? "workspace_wa_number",
        bodyText: event.bodyText ?? "",
        status: "received",
        idempotencyKey: `inbound_wa_${event.eventId}`,
        receivedAt: event.occurredAt ?? new Date(),
      })
      .onConflictDoNothing();

    logger.info("WhatsApp webhook: recorded inbound message", {
      from: event.senderAddress,
      workspaceId,
      clientId: matchedClientId,
    });
  }

  res.status(200).json({ received: true });
}
