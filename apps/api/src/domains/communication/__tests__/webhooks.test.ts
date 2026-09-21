import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock the database client
vi.mock("../../../db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the logger
vi.mock("../../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from "../../../db/client";
import { handleEmailWebhook } from "../email.webhook";
import { handleWhatsAppWebhook } from "../whatsapp.webhook";

describe("Webhook Handlers", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let resStatus: number;
  let resJson: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    resStatus = 200;
    resJson = null;

    mockRes = {
      status: vi.fn().mockImplementation((status: number) => {
        resStatus = status;
        return mockRes;
      }),
      json: vi.fn().mockImplementation((data: unknown) => {
        resJson = data;
        return mockRes;
      }),
    };
  });

  describe("handleEmailWebhook", () => {
    it("handles invalid JSON payload gracefully with 200 and reason", async () => {
      mockReq = {
        body: "invalid{json",
        headers: {},
      };

      await handleEmailWebhook(mockReq as Request, mockRes as Response);

      expect(resStatus).toBe(200);
      expect(resJson).toEqual({ received: false, reason: "invalid_payload" });
    });

    it("deduplicates already-processed webhook events", async () => {
      mockReq = {
        body: {
          id: "evt_duplicate",
          type: "email.delivered",
          data: { email_id: "msg_1" },
        },
        headers: {},
      };

      // Mock deduplication check returning an existing event
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: "evt-db-1" }]),
          }),
        }),
      });

      await handleEmailWebhook(mockReq as Request, mockRes as Response);

      expect(resStatus).toBe(200);
      expect(resJson).toEqual({ received: true, duplicate: true });
    });
  });

  describe("handleWhatsAppWebhook", () => {
    it("rejects payload missing event declaration", async () => {
      mockReq = {
        body: { data: {} },
        headers: {},
      };

      await handleWhatsAppWebhook(mockReq as Request, mockRes as Response);

      expect(resStatus).toBe(200);
      expect(resJson).toEqual({ received: false, reason: "invalid_payload" });
    });

    it("deduplicates already processed WhatsApp events", async () => {
      mockReq = {
        body: {
          event: "message.delivered",
          data: { id: "wa_evt_dup" },
        },
        headers: {},
      };

      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: "wa-event-1" }]),
          }),
        }),
      });

      await handleWhatsAppWebhook(mockReq as Request, mockRes as Response);

      expect(resStatus).toBe(200);
      expect(resJson).toEqual({ received: true, duplicate: true });
    });
  });
});
