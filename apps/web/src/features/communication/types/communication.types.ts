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

export interface CommunicationMessage {
  id: string;
  workspaceId: string;
  clientId: string | null;
  projectId: string | null;
  invoiceId: string | null;
  changeOrderId: string | null;
  channel: CommunicationChannelType;
  direction: CommunicationDirection;
  provider: CommunicationProviderType;
  providerMessageId: string | null;
  providerThreadId: string | null;
  recipientAddress: string;
  senderAddress: string | null;
  subject: string | null;
  bodyText: string;
  bodyHtml: string | null;
  templateKey: string | null;
  templateVersion: string | null;
  status: CommunicationMessageStatus;
  idempotencyKey: string;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface RenderedTemplate {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}
