/**
 * WA-AKG (WhatsApp API Kit Gateway) Provider
 *
 * WA-AKG is a self-hosted WhatsApp gateway built on Baileys.
 * Repo: https://github.com/mrifqidaffaaditya/WA-AKG
 *
 * REST contract (as documented in the WA-AKG source):
 *   POST /send-message
 *     Body: { number: string, message: string }
 *     Headers: { "x-api-key": string }
 *   Response: { status: boolean, message: string, data?: { id: string } }
 *
 * Webhook events (delivered to our /webhooks/whatsapp endpoint):
 *   { event: string, data: { id: string, from: string, text: { body: string }, timestamp: number } }
 *
 * Phone numbers must be sent WITHOUT the leading "+", as E.164 minus the "+"
 * (WA-AKG appends "@s.whatsapp.net" internally).  We strip the "+" here.
 */

import type { SendProviderResult } from "../../communication.types";
import type {
  WhatsAppProvider,
  SendWhatsAppProviderInput,
  WhatsAppWebhookVerifyResult,
} from "./whatsapp.provider";

// ---------------------------------------------------------------------------
// WA-AKG API response shapes
// ---------------------------------------------------------------------------

interface WaAkgSendResponse {
  status: boolean;
  message: string;
  data?: {
    id: string; // WAMID returned by Baileys
    [key: string]: unknown;
  };
}

interface WaAkgWebhookPayload {
  event?: string;
  data?: {
    id?: string;
    from?: string;
    text?: { body?: string };
    timestamp?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helper — strip "+" prefix for WA-AKG, keep the rest of the E.164 number
// ---------------------------------------------------------------------------
function normalisePhone(e164: string): string {
  return e164.startsWith("+") ? e164.slice(1) : e164;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class WaAkgWhatsAppProvider implements WhatsAppProvider {
  private readonly gatewayUrl: string;
  private readonly apiKey: string;

  constructor(options?: { gatewayUrl?: string; apiKey?: string }) {
    this.gatewayUrl =
      options?.gatewayUrl ||
      (typeof process !== "undefined"
        ? (process.env.WA_AKG_GATEWAY_URL ?? "")
        : "");
    this.apiKey =
      options?.apiKey ||
      (typeof process !== "undefined"
        ? (process.env.WA_AKG_API_KEY ?? "")
        : "");
  }

  // -------------------------------------------------------------------------
  // send
  // -------------------------------------------------------------------------

  public async send(
    input: SendWhatsAppProviderInput,
  ): Promise<SendProviderResult> {
    if (!this.gatewayUrl) {
      return {
        success: false,
        errorMessage: "WA_AKG_GATEWAY_URL is not configured",
      };
    }

    const sendUrl = `${this.gatewayUrl.replace(/\/$/, "")}/send-message`;
    const phone = normalisePhone(input.to);

    try {
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          // WA-AKG does not have first-class idempotency-key support, but we
          // send it as a custom header for traceability.
          "x-idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          number: phone,
          message: input.text,
        }),
      });

      const data = (await response.json()) as WaAkgSendResponse;

      if (!response.ok || !data.status) {
        return {
          success: false,
          errorMessage:
            data.message ||
            `WA-AKG gateway error (HTTP ${response.status})`,
        };
      }

      return {
        success: true,
        providerMessageId: data.data?.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      return {
        success: false,
        errorMessage: `Failed to dispatch WhatsApp via WA-AKG: ${message}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // verifyWebhook
  // -------------------------------------------------------------------------

  public async verifyWebhook(
    rawBody: string,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WhatsAppWebhookVerifyResult> {
    let payload: WaAkgWebhookPayload;

    try {
      payload = JSON.parse(rawBody) as WaAkgWebhookPayload;
    } catch {
      return {
        valid: false,
        error: "Malformed JSON payload received from WA-AKG webhook",
      };
    }

    // WA-AKG does not sign webhooks with HMAC (as of current OSS version).
    // If the gateway is behind our own infra this is acceptable — we rely on
    // network-level security (private subnet / firewall rule).
    // TODO: if a future WA-AKG release adds HMAC signing, verify here.

    const event = payload.event;
    // Reject payloads that don't declare an event type — we can't process them
    // safely without knowing what kind of event it is.
    if (!event) {
      return {
        valid: false,
        error: "WA-AKG webhook: missing 'event' field in payload",
      };
    }

    const data = payload.data ?? {};

    // Normalise sender: WA-AKG sends "628888888888@s.whatsapp.net"
    const rawFrom = typeof data.from === "string" ? data.from : undefined;
    const senderPhone = rawFrom
      ? `+${rawFrom.replace(/@.*$/, "")}`
      : undefined;

    const occurredAt =
      typeof data.timestamp === "number"
        ? new Date(data.timestamp * 1000)
        : new Date();

    return {
      valid: true,
      event: {
        eventId:
          typeof data.id === "string"
            ? data.id
            : `wa_akg_evt_${Date.now()}`,
        eventType: event,
        providerMessageId: typeof data.id === "string" ? data.id : undefined,
        senderAddress: senderPhone,
        bodyText: data.text?.body,
        occurredAt,
        rawPayload: payload as Record<string, unknown>,
      },
    };
  }
}
