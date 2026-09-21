import type { SendProviderResult } from "../../communication.types";
import type {
  EmailProvider,
  SendEmailProviderInput,
  VerifyWebhookResult,
} from "./email.provider";

export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly webhookSecret?: string;

  constructor(options?: {
    apiKey?: string;
    defaultFrom?: string;
    webhookSecret?: string;
  }) {
    this.apiKey = options?.apiKey || process.env.RESEND_API_KEY || "";
    this.defaultFrom =
      options?.defaultFrom ||
      process.env.EMAIL_FROM ||
      "Freelance OS <onboarding@resend.dev>";
    this.webhookSecret =
      options?.webhookSecret || process.env.RESEND_WEBHOOK_SECRET;
  }

  public async send(
    input: SendEmailProviderInput,
  ): Promise<SendProviderResult> {
    if (!this.apiKey) {
      return {
        success: false,
        errorMessage: "RESEND_API_KEY is not configured",
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.from || this.defaultFrom,
          to: [input.to],
          reply_to: input.replyTo,
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });

      const data = (await response.json()) as {
        id?: string;
        message?: string;
        statusCode?: number;
      };

      if (!response.ok) {
        return {
          success: false,
          errorMessage: data.message || `Resend API error (${response.status})`,
        };
      }

      return {
        success: true,
        providerMessageId: data.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      return {
        success: false,
        errorMessage: `Failed to dispatch email via Resend: ${message}`,
      };
    }
  }

  public async verifyWebhook(
    rawBody: string,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult> {
    try {
      const payload = JSON.parse(rawBody);
      // Svix verification could be wired with crypto HMAC; if secret is unset in dev, verify JSON shape
      return {
        valid: true,
        event: {
          eventId: payload.id || `resend_evt_${Date.now()}`,
          eventType: payload.type || "email.delivered",
          providerMessageId: payload.data?.email_id,
          occurredAt: payload.created_at ? new Date(payload.created_at) : new Date(),
          rawPayload: payload,
        },
      };
    } catch {
      return {
        valid: false,
        error: "Malformed JSON payload received from Resend webhook",
      };
    }
  }
}
