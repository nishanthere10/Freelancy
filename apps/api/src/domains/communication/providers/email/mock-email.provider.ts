import type { SendProviderResult } from "../../communication.types";
import type {
  EmailProvider,
  SendEmailProviderInput,
  VerifyWebhookResult,
} from "./email.provider";

export class MockEmailProvider implements EmailProvider {
  public sentEmails: SendEmailProviderInput[] = [];

  public async send(
    input: SendEmailProviderInput,
  ): Promise<SendProviderResult> {
    this.sentEmails.push(input);
    const mockId = `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      providerMessageId: mockId,
      providerThreadId: `mock_thread_${Date.now()}`,
    };
  }

  public async verifyWebhook(
    rawBody: string,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifyWebhookResult> {
    try {
      const parsed = JSON.parse(rawBody);
      return {
        valid: true,
        event: {
          eventId: parsed.id || `mock_event_${Date.now()}`,
          eventType: parsed.type || "email.delivered",
          providerMessageId: parsed.data?.email_id || parsed.email_id,
          occurredAt: new Date(),
          rawPayload: parsed,
        },
      };
    } catch {
      return {
        valid: false,
        error: "Invalid mock webhook payload",
      };
    }
  }

  public clear(): void {
    this.sentEmails = [];
  }
}

export const mockEmailProvider = new MockEmailProvider();
