/**
 * Mock WhatsApp provider for unit tests and CI.
 *
 * Behaviour:
 * - send()          → always resolves success with a deterministic fake WAMID
 * - verifyWebhook() → parses the raw body as JSON and returns a normalised event
 *
 * Captures every call so tests can assert on payloads.
 */

import type { SendProviderResult } from "../../communication.types";
import type {
  WhatsAppProvider,
  SendWhatsAppProviderInput,
  WhatsAppWebhookVerifyResult,
} from "./whatsapp.provider";

export interface MockWhatsAppCall {
  to: string;
  text: string;
  idempotencyKey: string;
  sentAt: Date;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  public readonly calls: MockWhatsAppCall[] = [];

  /** Set to true to simulate a gateway failure in the next send() call. */
  public simulateFailure = false;

  public async send(
    input: SendWhatsAppProviderInput,
  ): Promise<SendProviderResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        errorMessage: "MockWhatsAppProvider: simulated send failure",
      };
    }

    this.calls.push({
      to: input.to,
      text: input.text,
      idempotencyKey: input.idempotencyKey,
      sentAt: new Date(),
    });

    // Return a stable WAMID derived from the idempotency key so tests can
    // assert on the exact provider message ID without involving randomness.
    return {
      success: true,
      providerMessageId: `mock_wa_${input.idempotencyKey}`,
    };
  }

  public async verifyWebhook(
    rawBody: string,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WhatsAppWebhookVerifyResult> {
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {
        valid: false,
        error: "MockWhatsAppProvider: invalid JSON in webhook body",
      };
    }

    const data =
      typeof payload.data === "object" && payload.data !== null
        ? (payload.data as Record<string, unknown>)
        : {};

    return {
      valid: true,
      event: {
        eventId:
          typeof data.id === "string"
            ? data.id
            : `mock_wa_evt_${Date.now()}`,
        eventType:
          typeof payload.event === "string"
            ? payload.event
            : "message.received",
        providerMessageId:
          typeof data.id === "string" ? data.id : undefined,
        senderAddress:
          typeof data.from === "string"
            ? `+${(data.from as string).replace(/@.*$/, "")}`
            : undefined,
        bodyText:
          typeof data.text === "object" &&
          data.text !== null &&
          typeof (data.text as Record<string, unknown>).body === "string"
            ? ((data.text as Record<string, unknown>).body as string)
            : undefined,
        occurredAt: new Date(),
        rawPayload: payload,
      },
    };
  }

  /** Utility for test teardown — clear captured calls. */
  public reset(): void {
    this.calls.length = 0;
    this.simulateFailure = false;
  }
}
