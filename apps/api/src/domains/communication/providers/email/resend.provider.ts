import crypto from "crypto";
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
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult> {
    try {
      // If secret is configured, enforce Svix HMAC signature verification
      if (this.webhookSecret) {
        const svixId = (headers["svix-id"] || headers["Svix-Id"]) as
          | string
          | undefined;
        const svixTimestamp = (headers["svix-timestamp"] ||
          headers["Svix-Timestamp"]) as string | undefined;
        const svixSignature = (headers["svix-signature"] ||
          headers["Svix-Signature"]) as string | undefined;

        if (!svixId || !svixTimestamp || !svixSignature) {
          return {
            valid: false,
            error: "Missing required Svix webhook signature headers",
          };
        }

        // Timestamp tolerance: 5 minutes (300 seconds)
        const timestampSec = parseInt(svixTimestamp, 10);
        const nowSec = Math.floor(Date.now() / 1000);
        if (
          Number.isNaN(timestampSec) ||
          Math.abs(nowSec - timestampSec) > 300
        ) {
          return {
            valid: false,
            error: "Webhook timestamp expired or invalid",
          };
        }

        const secretKey = this.webhookSecret.startsWith("whsec_")
          ? Buffer.from(this.webhookSecret.slice(6), "base64")
          : Buffer.from(this.webhookSecret);

        const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
        const computedSignature = crypto
          .createHmac("sha256", secretKey)
          .update(signedPayload)
          .digest("base64");

        const signatures = svixSignature.split(" ");
        let signatureMatched = false;

        for (const sig of signatures) {
          const [version, signatureValue] = sig.split(",");
          if (version === "v1" && signatureValue) {
            const isLengthMatch =
              signatureValue.length === computedSignature.length;
            const safeSig = isLengthMatch ? signatureValue : computedSignature;
            if (
              crypto.timingSafeEqual(
                Buffer.from(safeSig),
                Buffer.from(computedSignature),
              ) &&
              isLengthMatch
            ) {
              signatureMatched = true;
              break;
            }
          }
        }

        if (!signatureMatched) {
          return {
            valid: false,
            error: "Invalid webhook signature",
          };
        }
      }

      const payload = JSON.parse(rawBody);
      return {
        valid: true,
        event: {
          eventId: payload.id || `resend_evt_${Date.now()}`,
          eventType: payload.type || "email.delivered",
          providerMessageId: payload.data?.email_id,
          occurredAt: payload.created_at
            ? new Date(payload.created_at)
            : new Date(),
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

