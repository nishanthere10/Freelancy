import type {
  CommunicationChannel,
  CommunicationEvent,
  CommunicationMessage,
  CommunicationPreference,
} from "@repo/database";

export type CommunicationChannelType = "email" | "whatsapp";
export type CommunicationProviderType =
  | "resend"
  | "wa_akg"
  | "meta_whatsapp"
  | "mock";
export type CommunicationMessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "received"
  | "failed"
  | "bounced";
export type CommunicationDirection = "outbound" | "inbound";

export interface SendEmailInput {
  workspaceId: string;
  actorId: string;
  clientId: string;
  projectId?: string;
  invoiceId?: string;
  changeOrderId?: string;
  recipientEmail?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  templateKey?: string;
  templateVariables?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface SendWhatsAppInput {
  workspaceId: string;
  actorId: string;
  clientId: string;
  projectId?: string;
  invoiceId?: string;
  changeOrderId?: string;
  recipientPhone?: string;
  messageText?: string;
  templateKey?: string;
  templateVariables?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface ListMessagesQuery {
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
  changeOrderId?: string;
  channel?: CommunicationChannelType;
  direction?: CommunicationDirection;
  status?: CommunicationMessageStatus;
  limit?: number;
  offset?: number;
}

export interface SendProviderResult {
  success: boolean;
  providerMessageId?: string;
  providerThreadId?: string;
  errorMessage?: string;
}

export interface InboundWebhookPayload {
  provider: CommunicationProviderType;
  providerEventId: string;
  eventType: string;
  senderAddress?: string;
  recipientAddress?: string;
  providerMessageId?: string;
  subject?: string;
  bodyText?: string;
  occurredAt?: Date;
  rawPayload: Record<string, unknown>;
}

export interface MessageWithRelations extends CommunicationMessage {
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}
