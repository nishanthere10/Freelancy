import { describe, expect, it } from "vitest";
import { MockEmailProvider } from "../providers/email/mock-email.provider";
import { MockWhatsAppProvider } from "../providers/whatsapp/mock-whatsapp.provider";
import { WaAkgWhatsAppProvider } from "../providers/whatsapp/wa-akg.provider";

describe("Communication Providers", () => {
  describe("MockEmailProvider", () => {
    it("records sent emails and returns deterministic mock ID", async () => {
      const provider = new MockEmailProvider();
      const result = await provider.send({
        to: "test@example.com",
        subject: "Hello",
        text: "Test body",
        idempotencyKey: "test-idem-1",
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toContain("mock_email_");
      expect(provider.sentEmails).toHaveLength(1);
      expect(provider.sentEmails[0].to).toBe("test@example.com");
    });

    it("verifies webhook payload successfully", async () => {
      const provider = new MockEmailProvider();
      const result = await provider.verifyWebhook(
        JSON.stringify({
          id: "evt-123",
          type: "email.delivered",
          data: { email_id: "msg-456" },
        }),
        {},
      );

      expect(result.valid).toBe(true);
      expect(result.event?.eventId).toBe("evt-123");
      expect(result.event?.eventType).toBe("email.delivered");
      expect(result.event?.providerMessageId).toBe("msg-456");
    });
  });

  describe("MockWhatsAppProvider", () => {
    it("captures calls and handles simulated failure flag", async () => {
      const provider = new MockWhatsAppProvider();
      const successResult = await provider.send({
        to: "+1234567890",
        text: "Hi",
        idempotencyKey: "idem-wa-1",
      });

      expect(successResult.success).toBe(true);
      expect(successResult.providerMessageId).toBe("mock_wa_idem-wa-1");
      expect(provider.calls).toHaveLength(1);

      provider.simulateFailure = true;
      const failResult = await provider.send({
        to: "+1234567890",
        text: "Hi again",
        idempotencyKey: "idem-wa-2",
      });

      expect(failResult.success).toBe(false);
      expect(failResult.errorMessage).toContain("simulated send failure");
    });
  });

  describe("WaAkgWhatsAppProvider", () => {
    it("normalises phone numbers and parses webhook payloads", async () => {
      const provider = new WaAkgWhatsAppProvider({
        gatewayUrl: "http://localhost:3000",
        apiKey: "dummy-key",
      });

      const payload = {
        event: "message.received",
        data: {
          id: "wamid-999",
          from: "1234567890@s.whatsapp.net",
          text: { body: "Client replying here" },
          timestamp: 1726700000,
        },
      };

      const verifyResult = await provider.verifyWebhook(
        JSON.stringify(payload),
        {},
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.event?.eventId).toBe("wamid-999");
      expect(verifyResult.event?.senderAddress).toBe("+1234567890");
      expect(verifyResult.event?.bodyText).toBe("Client replying here");
    });

    it("rejects invalid JSON payload", async () => {
      const provider = new WaAkgWhatsAppProvider();
      const verifyResult = await provider.verifyWebhook("not-json{", {});
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toContain("Malformed JSON");
    });

    it("rejects payload without event field", async () => {
      const provider = new WaAkgWhatsAppProvider();
      const verifyResult = await provider.verifyWebhook("{}", {});
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toContain("missing 'event' field");
    });
  });
});
