import type { SendProviderResult } from "../../communication.types";

export interface SendEmailProviderInput {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
}

export interface VerifyWebhookResult {
  valid: boolean;
  event?: {
    eventId: string;
    eventType: string;
    providerMessageId?: string;
    occurredAt?: Date;
    rawPayload: Record<string, unknown>;
  };
  error?: string;
}

export interface EmailProvider {
  send(input: SendEmailProviderInput): Promise<SendProviderResult>;
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult>;
}
