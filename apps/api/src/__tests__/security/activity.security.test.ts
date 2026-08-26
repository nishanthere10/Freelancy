import { describe, expect, it, vi } from "vitest";
import {
  ActivityEventConsumer,
  sanitizeActivityMetadata,
} from "../../domains/activity/activity.consumer";

describe("Security: Activity & Audit Trail Integrity", () => {
  describe("Metadata Sanitization & Credential Redaction", () => {
    it("redacts sensitive credential keys from activity metadata", () => {
      const dirtyMetadata = {
        entityName: "Project Alpha",
        apiKey: "sk_live_1234567890abcdef",
        password: "super-secret-password",
        token: "bearer-token-secret",
        authToken: "jwt-token-here",
        creditCard: "4111-2222-3333-4444",
        nested: {
          secretKey: "nested-secret",
          normalField: "safe value",
        },
      };

      const sanitized = sanitizeActivityMetadata(dirtyMetadata as any);
      expect(sanitized).toBeDefined();
      expect(sanitized?.apiKey).toBe("[REDACTED]");
      expect(sanitized?.password).toBe("[REDACTED]");
      expect(sanitized?.token).toBe("[REDACTED]");
      expect((sanitized as any)?.authToken).toBe("[REDACTED]");
      expect((sanitized as any)?.creditCard).toBe("[REDACTED]");
      expect((sanitized as any)?.nested?.secretKey).toBe("[REDACTED]");
      expect((sanitized as any)?.nested?.normalField).toBe("safe value");
    });

    it("truncates oversized metadata strings to 1000 characters", () => {
      const hugeString = "X".repeat(2500);
      const metadata = {
        notes: hugeString,
      };

      const sanitized = sanitizeActivityMetadata(metadata as any);
      expect(sanitized?.notes?.length).toBeLessThan(1050);
      expect(sanitized?.notes).toContain("[TRUNCATED]");
    });
  });

  describe("Fail-Safe Ingestion", () => {
    it("persists sanitized activity fail-safely", async () => {
      const createdItems: any[] = [];
      const fakeRepo = {
        create: vi.fn().mockImplementation((item) => {
          createdItems.push(item);
          return Promise.resolve(item);
        }),
      };
      const consumer = new ActivityEventConsumer(fakeRepo as any);

      await consumer.ingest({
        workspaceId: "ws-1",
        actorUserId: "user-1",
        eventType: "client.created",
        entityType: "client",
        entityId: "client-1",
        metadata: {
          entityName: "Safe Client",
          secretToken: "secret123",
        } as any,
        createdAt: new Date(),
      });

      expect(createdItems.length).toBe(1);
      expect((createdItems[0].metadata as any).secretToken).toBe("[REDACTED]");
      expect((createdItems[0].metadata as any).entityName).toBe("Safe Client");
    });
  });
});
