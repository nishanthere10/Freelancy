import type { SendProviderResult } from "../../communication.types";

// ---------------------------------------------------------------------------
// Shared input / output shapes for WhatsApp providers
// ---------------------------------------------------------------------------

export interface SendWhatsAppProviderInput {
  /** E.164 phone number, e.g. "+918888888888" */
  to: string;
  /** Plain-text message body */
  text: string;
  /** Stable, unique key used to deduplicate sends at the provider level */
  idempotencyKey: string;
}

export interface WhatsAppWebhookVerifyResult {
  valid: boolean;
  event?: {
    /** Stable ID assigned by the gateway for this webhook delivery */
    eventId: string;
    /** e.g. "message.received", "message.delivered", "message.read" */
    eventType: string;
    /** Provider-side message ID (WAMID from Baileys / WA-AKG) */
    providerMessageId?: string;
    /** E.164 sender address (for inbound) or recipient (for status events) */
    senderAddress?: string;
    /** Text body of the message, if applicable */
    bodyText?: string;
    occurredAt?: Date;
    rawPayload: Record<string, unknown>;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider interface — every WhatsApp integration must satisfy this contract
// ---------------------------------------------------------------------------

export interface WhatsAppProvider {
  /**
   * Send an outbound text message.
   * Must return `success: true` and a `providerMessageId` on success.
   */
  send(input: SendWhatsAppProviderInput): Promise<SendProviderResult>;

  /**
   * Validate an inbound webhook delivery from the gateway and extract a
   * normalised event envelope.
   */
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WhatsAppWebhookVerifyResult>;
}
