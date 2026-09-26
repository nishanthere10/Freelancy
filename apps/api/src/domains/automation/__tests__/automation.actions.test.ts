import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import type { Request, Response } from "express";

const dbStore = {
  automationActionRuns: new Map<string, any>(),
};

function resetDbStore() {
  dbStore.automationActionRuns.clear();
}

vi.mock("../../../db/client", () => ({
  db: {
    insert: () => ({
      values: (data: any) => {
        const record = {
          id: data.id || crypto.randomUUID(),
          ...data,
          status: data.status || "running",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const execute = () => {
          for (const existing of dbStore.automationActionRuns.values()) {
            if (
              existing.workspaceId === data.workspaceId &&
              existing.idempotencyKey === data.idempotencyKey
            ) {
              return [];
            }
          }
          dbStore.automationActionRuns.set(record.id, record);
          return [record];
        };
        return {
          onConflictDoNothing: () => ({
            returning: async () => execute(),
          }),
          returning: async () => execute(),
        };
      },
    }),

    select: () => ({
      from: () => ({
        where: () => {
          const rows = Array.from(dbStore.automationActionRuns.values());
          return {
            limit: (lim: number) => Promise.resolve(rows.slice(0, lim)),
            then: (res: any) => Promise.resolve(rows).then(res),
          };
        },
      }),
    }),

    update: () => ({
      set: (updateData: any) => ({
        where: () => ({
          returning: async () => {
            const rows = Array.from(dbStore.automationActionRuns.values());
            if (rows.length > 0) {
              const target = rows[rows.length - 1];
              Object.assign(target, updateData, { updatedAt: new Date() });
              return [target];
            }
            return [];
          },
        }),
      }),
    }),
  },
}));

vi.mock("../../../config", () => ({
  config: {
    n8nWebhookSecret: "super-secret-test-token-12345",
  },
}));

const { mockSendEmail, mockSendWhatsApp } = vi.hoisted(() => ({
  mockSendEmail: vi.fn().mockResolvedValue({ id: "msg-email-123" }),
  mockSendWhatsApp: vi.fn().mockResolvedValue({ id: "msg-wa-123" }),
}));

vi.mock("../../communication/communication.service", () => {
  return {
    CommunicationService: vi.fn().mockImplementation(() => ({
      sendEmail: mockSendEmail,
      sendWhatsApp: mockSendWhatsApp,
    })),
  };
});

import { sendEmailAction } from "../actions/send-email.action";
import { sendWhatsAppAction } from "../actions/send-whatsapp.action";

describe("Sprint 20 Internal Action Handlers & Security Suite", () => {
  let mockRes: Partial<Response>;
  let statusCode: number;
  let responseData: any;

  beforeEach(() => {
    resetDbStore();
    vi.clearAllMocks();
    statusCode = 200;
    responseData = null;

    mockRes = {
      status: vi.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockRes;
      }),
      json: vi.fn().mockImplementation((data: any) => {
        responseData = data;
        return mockRes;
      }),
    };
  });

  describe("sendEmailAction", () => {
    it("rejects unauthorized request with 401 when token is missing or invalid", async () => {
      const mockReq = {
        headers: { authorization: "Bearer wrong-token" },
        body: {},
      } as Partial<Request>;

      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());

      expect(statusCode).toBe(401);
      expect(responseData.error).toBe("UNAUTHORIZED");
    });

    it("rejects request with mismatched length token via timing-safe check", async () => {
      const mockReq = {
        headers: { authorization: "Bearer short" },
        body: {},
      } as Partial<Request>;

      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());

      expect(statusCode).toBe(401);
    });

    it("rejects bad request when required fields are missing", async () => {
      const mockReq = {
        headers: { authorization: "Bearer super-secret-test-token-12345" },
        body: { automationId: "auto-1" }, // missing workspaceId, eventId, actionIndex
      } as Partial<Request>;

      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());

      expect(statusCode).toBe(400);
      expect(responseData.error).toBe("BAD_REQUEST");
    });

    it("executes email sending and records idempotency state when authorized", async () => {
      const mockReq = {
        headers: { authorization: "Bearer super-secret-test-token-12345" },
        body: {
          workspaceId: "ws-1",
          automationId: "auto-1",
          eventId: "event-1",
          actionIndex: 0,
          definitionVersion: 1,
          automationRunId: "run-uuid-1",
          actionPayload: {
            type: "send_email",
            templateKey: "invoice_ready",
            recipient: "owner",
          },
        },
      } as Partial<Request>;

      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());

      expect(statusCode).toBe(200);
      expect(responseData.data.messageId).toBe("msg-email-123");
      expect(mockSendEmail).toHaveBeenCalledTimes(1);

      const actionRuns = Array.from(dbStore.automationActionRuns.values());
      expect(actionRuns).toHaveLength(1);
      expect(actionRuns[0].status).toBe("succeeded");
      expect(actionRuns[0].providerMessageId).toBe("msg-email-123");
    });

    it("returns already_completed for duplicate action executions with succeeded status", async () => {
      const mockReq = {
        headers: { authorization: "Bearer super-secret-test-token-12345" },
        body: {
          workspaceId: "ws-1",
          automationId: "auto-1",
          eventId: "event-1",
          actionIndex: 0,
          definitionVersion: 1,
          automationRunId: "run-uuid-1",
          actionPayload: {
            type: "send_email",
            templateKey: "invoice_ready",
            recipient: "owner",
          },
        },
      } as Partial<Request>;

      // First run succeeds
      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());
      expect(statusCode).toBe(200);

      // Second run detects completed status
      await sendEmailAction(mockReq as Request, mockRes as Response, vi.fn());
      expect(statusCode).toBe(200);
      expect(responseData.data.status).toBe("already_completed");
      expect(mockSendEmail).toHaveBeenCalledTimes(1); // Communication service not called a second time!
    });
  });

  describe("sendWhatsAppAction", () => {
    it("executes WhatsApp sending and records idempotency state when authorized", async () => {
      const mockReq = {
        headers: { authorization: "Bearer super-secret-test-token-12345" },
        body: {
          workspaceId: "ws-1",
          automationId: "auto-1",
          eventId: "event-1",
          actionIndex: 1,
          definitionVersion: 1,
          automationRunId: "run-uuid-1",
          actionPayload: {
            type: "send_whatsapp",
            templateKey: "payment_reminder",
            recipient: "client",
          },
        },
      } as Partial<Request>;

      await sendWhatsAppAction(mockReq as Request, mockRes as Response, vi.fn());

      expect(statusCode).toBe(200);
      expect(responseData.data.messageId).toBe("msg-wa-123");
      expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
    });
  });
});
