/**
 * CommunicationService
 *
 * The heart of the Communication Hub. All business logic for sending email
 * and WhatsApp messages lives here. Controllers call this service; it never
 * returns HTTP-specific types.
 *
 * Design decisions:
 * - Adapter pattern: swappable EmailProvider / WhatsAppProvider injected at
 *   construction time → easy to swap Resend for SES or WA-AKG for Meta API.
 * - Every send attempt creates a communication_message row BEFORE calling the
 *   provider, setting status = "sending".  On success the provider message ID
 *   is written back.  On failure the error is captured and status = "failed".
 *   This gives us a durable audit trail even when the provider is down.
 * - Idempotency enforced at DB level via unique index on (workspace_id, idempotency_key).
 */

import {
  clientsTable,
  communicationChannelsTable,
  communicationMessagesTable,
  communicationPreferencesTable,
} from "@repo/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { logger } from "../../utils/logger";
import {
  ClientOptedOutError,
  CommunicationChannelDisabledError,
  CommunicationValidationError,
  InvalidRecipientError,
  ProviderDeliveryError,
} from "./communication.errors";
import type {
  ListMessagesQuery,
  MessageWithRelations,
  SendEmailInput,
  SendProviderResult,
  SendWhatsAppInput,
} from "./communication.types";
import type { EmailProvider } from "./providers/email/email.provider";
import { ResendEmailProvider } from "./providers/email/resend.provider";
import { MockEmailProvider } from "./providers/email/mock-email.provider";
import type { WhatsAppProvider } from "./providers/whatsapp/whatsapp.provider";
import { WaAkgWhatsAppProvider } from "./providers/whatsapp/wa-akg.provider";
import { MockWhatsAppProvider } from "./providers/whatsapp/mock-whatsapp.provider";
import { TemplateService } from "./template.service";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CommunicationService {
  private readonly emailProvider: EmailProvider;
  private readonly whatsappProvider: WhatsAppProvider;
  private readonly templateService: TemplateService;

  constructor(options?: {
    emailProvider?: EmailProvider;
    whatsappProvider?: WhatsAppProvider;
  }) {
    this.emailProvider =
      options?.emailProvider ??
      (process.env.RESEND_API_KEY
        ? new ResendEmailProvider()
        : new MockEmailProvider());
    this.whatsappProvider =
      options?.whatsappProvider ??
      (process.env.WA_AKG_GATEWAY_URL
        ? new WaAkgWhatsAppProvider()
        : new MockWhatsAppProvider());
    this.templateService = new TemplateService();
  }

  // -------------------------------------------------------------------------
  // sendEmail
  // -------------------------------------------------------------------------

  public async sendEmail(input: SendEmailInput): Promise<MessageWithRelations> {
    const { workspaceId, clientId, idempotencyKey } = input;

    // 1. Check workspace channel is active
    const [channel] = await db
      .select()
      .from(communicationChannelsTable)
      .where(
        and(
          eq(communicationChannelsTable.workspaceId, workspaceId),
          eq(communicationChannelsTable.channel, "email"),
        ),
      )
      .limit(1);

    if (channel && channel.status !== "active") {
      throw new CommunicationChannelDisabledError("email");
    }

    // 2. Resolve and validate recipient
    let recipientEmail = input.recipientEmail;
    if (clientId) {
      const [client] = await db
        .select({ email: clientsTable.email })
        .from(clientsTable)
        .where(
          and(
            eq(clientsTable.id, clientId),
            eq(clientsTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new InvalidRecipientError(
          `Client '${clientId}' not found in workspace '${workspaceId}'`,
        );
      }

      if (!recipientEmail) {
        if (!client.email) {
          throw new InvalidRecipientError(
            `Client '${clientId}' has no email address on file`,
          );
        }
        recipientEmail = client.email;
      }

      // Check client opt-out preferences
      const prefs = await this.getClientPreferences(workspaceId, clientId);
      if (prefs && prefs.emailEnabled === false) {
        throw new ClientOptedOutError(clientId, "email");
      }
    } else if (!recipientEmail) {
      throw new InvalidRecipientError("Recipient email address is required");
    }

    // 3. Render template (or use raw body)
    let subject = input.subject;
    let bodyText = input.bodyText;
    let bodyHtml = input.bodyHtml;

    if (input.templateKey) {
      const rendered = this.templateService.render(
        input.templateKey,
        "email",
        input.templateVariables ?? {},
      );
      subject = input.subject || rendered.subject;
      bodyText = input.bodyText || rendered.bodyText;
      bodyHtml = input.bodyHtml || rendered.bodyHtml;
    }

    if (!subject || !bodyText) {
      throw new CommunicationValidationError(
        "Email subject and bodyText are required",
      );
    }

    // 4. Create message record (status: sending) — durable audit
    const [message] = await db
      .insert(communicationMessagesTable)
      .values({
        workspaceId,
        clientId,
        projectId: input.projectId,
        invoiceId: input.invoiceId,
        changeOrderId: input.changeOrderId,
        channel: "email",
        direction: "outbound",
        provider: channel?.provider ?? "resend",
        recipientAddress: recipientEmail,
        subject,
        bodyText,
        bodyHtml,
        templateKey: input.templateKey,
        templateVariables: input.templateVariables,
        status: "sending",
        idempotencyKey,
      })
      .onConflictDoNothing()
      .returning();

    // Idempotent: if the message already exists, return it
    if (!message) {
      const [existing] = await db
        .select()
        .from(communicationMessagesTable)
        .where(
          and(
            eq(communicationMessagesTable.workspaceId, workspaceId),
            eq(communicationMessagesTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      return existing as MessageWithRelations;
    }

    // 5. Dispatch via provider with failure safety
    let result: SendProviderResult;
    try {
      result = await this.emailProvider.send({
        to: recipientEmail,
        subject,
        text: bodyText,
        html: bodyHtml,
        idempotencyKey,
      });
    } catch (sendErr) {
      const errorMsg =
        sendErr instanceof Error
          ? sendErr.message
          : "Unexpected provider error";
      await db
        .update(communicationMessagesTable)
        .set({
          status: "failed",
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(communicationMessagesTable.id, message.id));

      throw new ProviderDeliveryError("resend", errorMsg, sendErr);
    }

    // 6. Update message with provider result
    const [updated] = await db
      .update(communicationMessagesTable)
      .set({
        status: result.success ? "sent" : "failed",
        providerMessageId: result.providerMessageId,
        providerThreadId: result.providerThreadId,
        errorMessage: result.errorMessage ?? null,
        sentAt: result.success ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(communicationMessagesTable.id, message.id))
      .returning();

    // Safety: if for any reason the update finds no row (shouldn't happen), return the pre-update record
    if (!updated) {
      return message as MessageWithRelations;
    }

    if (!result.success) {
      logger.error("CommunicationService: email delivery failed", {
        messageId: message.id,
        error: result.errorMessage,
      });
      throw new ProviderDeliveryError(
        "resend",
        result.errorMessage ?? "Unknown provider error",
      );
    }

    logger.info("CommunicationService: email sent", {
      messageId: message.id,
      recipient: recipientEmail,
    });

    return updated as MessageWithRelations;
  }

  // -------------------------------------------------------------------------
  // sendWhatsApp
  // -------------------------------------------------------------------------

  public async sendWhatsApp(
    input: SendWhatsAppInput,
  ): Promise<MessageWithRelations> {
    const { workspaceId, clientId, idempotencyKey } = input;

    // 1. Check workspace channel is active
    const [channel] = await db
      .select()
      .from(communicationChannelsTable)
      .where(
        and(
          eq(communicationChannelsTable.workspaceId, workspaceId),
          eq(communicationChannelsTable.channel, "whatsapp"),
        ),
      )
      .limit(1);

    if (channel && channel.status !== "active") {
      throw new CommunicationChannelDisabledError("whatsapp");
    }

    // 2. Resolve and validate recipient phone
    let recipientPhone = input.recipientPhone;
    if (clientId) {
      const [client] = await db
        .select({ phone: clientsTable.phone })
        .from(clientsTable)
        .where(
          and(
            eq(clientsTable.id, clientId),
            eq(clientsTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new InvalidRecipientError(
          `Client '${clientId}' not found in workspace '${workspaceId}'`,
        );
      }

      if (!recipientPhone) {
        if (!client.phone) {
          throw new InvalidRecipientError(
            `Client '${clientId}' has no phone number on file`,
          );
        }
        recipientPhone = client.phone;
      }

      // Check client opt-out preferences
      const prefs = await this.getClientPreferences(workspaceId, clientId);
      if (prefs && prefs.whatsappEnabled === false) {
        throw new ClientOptedOutError(clientId, "whatsapp");
      }
    } else if (!recipientPhone) {
      throw new InvalidRecipientError("Recipient phone number is required");
    }

    // 3. Render template or use raw message
    let messageText = input.messageText;
    if (input.templateKey) {
      const rendered = this.templateService.render(
        input.templateKey,
        "whatsapp",
        input.templateVariables ?? {},
      );
      messageText = input.messageText || rendered.bodyText;
    }

    if (!messageText) {
      throw new CommunicationValidationError(
        "WhatsApp messageText is required",
      );
    }

    // 4. Create message record
    const [message] = await db
      .insert(communicationMessagesTable)
      .values({
        workspaceId,
        clientId,
        projectId: input.projectId,
        invoiceId: input.invoiceId,
        changeOrderId: input.changeOrderId,
        channel: "whatsapp",
        direction: "outbound",
        provider: channel?.provider ?? "wa_akg",
        recipientAddress: recipientPhone,
        bodyText: messageText,
        templateKey: input.templateKey,
        templateVariables: input.templateVariables,
        status: "sending",
        idempotencyKey,
      })
      .onConflictDoNothing()
      .returning();

    if (!message) {
      const [existing] = await db
        .select()
        .from(communicationMessagesTable)
        .where(
          and(
            eq(communicationMessagesTable.workspaceId, workspaceId),
            eq(communicationMessagesTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      return existing as MessageWithRelations;
    }

    // 5. Dispatch with failure safety
    let result: SendProviderResult;
    try {
      result = await this.whatsappProvider.send({
        to: recipientPhone,
        text: messageText,
        idempotencyKey,
      });
    } catch (sendErr) {
      const errorMsg =
        sendErr instanceof Error
          ? sendErr.message
          : "Unexpected provider error";
      await db
        .update(communicationMessagesTable)
        .set({
          status: "failed",
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(communicationMessagesTable.id, message.id));

      throw new ProviderDeliveryError("wa_akg", errorMsg, sendErr);
    }

    // 6. Persist result
    const [updated] = await db
      .update(communicationMessagesTable)
      .set({
        status: result.success ? "sent" : "failed",
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage ?? null,
        sentAt: result.success ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(communicationMessagesTable.id, message.id))
      .returning();

    if (!updated) {
      return message as MessageWithRelations;
    }

    if (!result.success) {
      logger.error("CommunicationService: WhatsApp delivery failed", {
        messageId: message.id,
        error: result.errorMessage,
      });
      throw new ProviderDeliveryError(
        "wa_akg",
        result.errorMessage ?? "Unknown provider error",
      );
    }

    logger.info("CommunicationService: WhatsApp sent", {
      messageId: message.id,
      recipient: recipientPhone,
    });

    return updated as MessageWithRelations;
  }

  // -------------------------------------------------------------------------
  // listMessages
  // -------------------------------------------------------------------------

  public async listMessages(
    workspaceId: string,
    query: ListMessagesQuery,
  ): Promise<MessageWithRelations[]> {
    const conditions = [
      eq(communicationMessagesTable.workspaceId, workspaceId),
    ];

    if (query.clientId) {
      conditions.push(
        eq(communicationMessagesTable.clientId, query.clientId),
      );
    }
    if (query.projectId) {
      conditions.push(
        eq(communicationMessagesTable.projectId, query.projectId),
      );
    }
    if (query.invoiceId) {
      conditions.push(
        eq(communicationMessagesTable.invoiceId, query.invoiceId),
      );
    }
    if (query.changeOrderId) {
      conditions.push(
        eq(
          communicationMessagesTable.changeOrderId,
          query.changeOrderId,
        ),
      );
    }
    if (query.channel) {
      conditions.push(
        eq(communicationMessagesTable.channel, query.channel),
      );
    }
    if (query.direction) {
      conditions.push(
        eq(communicationMessagesTable.direction, query.direction),
      );
    }
    if (query.status) {
      conditions.push(
        eq(communicationMessagesTable.status, query.status),
      );
    }

    const rows = await db
      .select({
        message: communicationMessagesTable,
        client: {
          id: clientsTable.id,
          name: clientsTable.name,
          email: clientsTable.email,
          phone: clientsTable.phone,
        },
      })
      .from(communicationMessagesTable)
      .leftJoin(
        clientsTable,
        and(
          eq(communicationMessagesTable.clientId, clientsTable.id),
          eq(communicationMessagesTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(communicationMessagesTable.createdAt))
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0);

    return rows.map((r) => ({
      ...r.message,
      client: r.client?.id ? r.client : null,
    })) as MessageWithRelations[];
  }

  // -------------------------------------------------------------------------
  // getClientPreferences
  // -------------------------------------------------------------------------

  public async getClientPreferences(workspaceId: string, clientId: string) {
    const [prefs] = await db
      .select()
      .from(communicationPreferencesTable)
      .where(
        and(
          eq(communicationPreferencesTable.workspaceId, workspaceId),
          eq(communicationPreferencesTable.clientId, clientId),
        ),
      )
      .limit(1);
    return prefs ?? null;
  }

  // -------------------------------------------------------------------------
  // upsertClientPreferences
  // -------------------------------------------------------------------------

  public async upsertClientPreferences(
    workspaceId: string,
    clientId: string,
    prefs: {
      emailEnabled?: boolean;
      whatsappEnabled?: boolean;
      projectUpdates?: boolean;
      invoiceNotifications?: boolean;
      changeOrderNotifications?: boolean;
    },
  ) {
    const [result] = await db
      .insert(communicationPreferencesTable)
      .values({
        workspaceId,
        clientId,
        ...prefs,
      })
      .onConflictDoUpdate({
        target: [
          communicationPreferencesTable.workspaceId,
          communicationPreferencesTable.clientId,
        ],
        set: {
          ...prefs,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return result;
  }
}
