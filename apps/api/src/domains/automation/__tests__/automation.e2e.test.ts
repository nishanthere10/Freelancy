import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// In-memory state store for database mock
const dbStore = {
  workspaces: new Map<string, any>(),
  automations: new Map<string, any>(),
  automationEvents: new Map<string, any>(),
  automationRuns: new Map<string, any>(),
  automationActionRuns: new Map<string, any>(),
};

function resetDbStore() {
  dbStore.workspaces.clear();
  dbStore.automations.clear();
  dbStore.automationEvents.clear();
  dbStore.automationRuns.clear();
  dbStore.automationActionRuns.clear();
}

function getStoreForTable(table: any): Map<string, any> {
  const name = table?.[Symbol.for("drizzle:Name")] || table?.name || "";
  if (name.includes("automation_events")) return dbStore.automationEvents;
  if (name.includes("automation_runs")) return dbStore.automationRuns;
  if (name.includes("automation_action_runs")) return dbStore.automationActionRuns;
  if (name.includes("automations")) return dbStore.automations;
  if (name.includes("workspaces")) return dbStore.workspaces;
  return dbStore.automations;
}

// Mock @/db/client before importing domain services
vi.mock("../../../db/client", () => {
  const mockDb = {
    insert: (table: any) => {
      const store = getStoreForTable(table);
      return {
        values: (data: any) => {
          const record = {
            id: data.id || crypto.randomUUID(),
            ...data,
            attempts: data.attempts ?? 0,
            status: data.status || "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const execute = () => {
            // Check unique constraints
            if (store === dbStore.automationEvents && data.eventId) {
              for (const existing of store.values()) {
                if (existing.eventId === data.eventId) {
                  return [];
                }
              }
            }
            if (store === dbStore.automationRuns && data.automationEventId && data.automationId) {
              for (const existing of store.values()) {
                if (
                  existing.automationEventId === data.automationEventId &&
                  existing.automationId === data.automationId
                ) {
                  return [];
                }
              }
            }
            store.set(record.id, record);
            return [record];
          };

          return {
            onConflictDoNothing: () => ({
              returning: async () => execute(),
            }),
            returning: async () => execute(),
          };
        },
      };
    },

    select: () => {
      return {
        from: (table: any) => {
          const store = getStoreForTable(table);
          const queryObj = {
            where: (_predicate: any) => {
              const allRows = Array.from(store.values());
              return {
                limit: (lim: number) => Promise.resolve(allRows.slice(0, lim)),
                orderBy: () => Promise.resolve(allRows),
                then: (resolve: any) => Promise.resolve(allRows).then(resolve),
              };
            },
            limit: (lim: number) => Promise.resolve(Array.from(store.values()).slice(0, lim)),
            orderBy: () => Promise.resolve(Array.from(store.values())),
            then: (resolve: any) => Promise.resolve(Array.from(store.values())).then(resolve),
          };
          return queryObj;
        },
      };
    },

    update: (table: any) => {
      const store = getStoreForTable(table);
      return {
        set: (updateData: any) => ({
          where: (_predicate: any) => ({
            returning: async () => {
              const items = Array.from(store.values());
              if (items.length > 0) {
                const target = items[items.length - 1];
                Object.assign(target, updateData, { updatedAt: new Date() });
                return [target];
              }
              return [];
            },
          }),
        }),
      };
    },
  };

  return { db: mockDb };
});

const mockAxiosInstance = {
  post: vi.fn().mockResolvedValue({ data: { id: "n8n-wf-1", active: true } }),
  put: vi.fn().mockResolvedValue({ data: { id: "n8n-wf-1", active: true } }),
  get: vi.fn().mockResolvedValue({ data: { id: "n8n-wf-1", active: true } }),
  delete: vi.fn().mockResolvedValue({ data: { success: true } }),
};

vi.mock("axios", () => {
  const rootMock = {
    post: vi.fn().mockResolvedValue({ data: { executionId: "n8n-exec-default" } }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: (err: any) => err?.isAxiosError === true,
  };
  return {
    default: rootMock,
    ...rootMock,
  };
});
vi.mock("../../communication/communication.service");

import { AutomationService } from "../automation.service";
import { AutomationDispatcher, isTransientError } from "../automation.dispatcher";
import { AutomationRepository } from "../automation.repository";
import { db } from "../../../db/client";
import {
  workspacesTable,
  automationEventsTable,
  automationRunsTable,
  automationsTable,
} from "@repo/database";
import axios from "axios";
import {
  DirectExecutionQueueAdapter,
  setAutomationQueueOverride,
  type IAutomationQueue,
} from "../automation.queue";

describe("Sprint 20 Automation End-to-End Reliability Suite", () => {
  let dispatcher: AutomationDispatcher;
  let service: AutomationService;
  let repo: AutomationRepository;
  const workspaceId = "test-workspace-id";

  beforeEach(() => {
    resetDbStore();
    setAutomationQueueOverride(null);
    repo = new AutomationRepository();
    service = new AutomationService(repo);
    dispatcher = new AutomationDispatcher();
    vi.clearAllMocks();
    mockAxiosInstance.post.mockResolvedValue({ data: { id: "n8n-wf-1", active: true } });
    mockAxiosInstance.put.mockResolvedValue({ data: { id: "n8n-wf-1", active: true } });
    mockAxiosInstance.get.mockResolvedValue({ data: { id: "n8n-wf-1", active: true } });
    vi.mocked(axios.post).mockResolvedValue({ data: { executionId: "n8n-exec-default" } });
  });

  it("should process a real business event end-to-end to an internal action", async () => {
    // 1. Create Workspace
    await db
      .insert(workspacesTable)
      .values({ id: workspaceId, name: "Test Workspace", slug: "test-workspace" })
      .onConflictDoNothing()
      .returning();

    // 2. Create Automation
    const automation = await service.createAutomation({
      workspaceId,
      createdByUserId: "user-1",
      name: "High Value Invoice Alert",
      triggerType: "event",
      triggerConfig: { type: "event", eventType: "invoice.created" },
      conditionConfig: {
        operator: "AND",
        conditions: [{ field: "invoice.total", operator: "gt", value: 50000 }],
      },
      actionConfig: [
        { type: "send_email", templateKey: "high_value_alert", recipient: "owner" },
      ],
      timezone: "UTC",
    });

    // 3. Activate Automation
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: "n8n-workflow-id", active: true } });
    await service.activateAutomation(workspaceId, automation.id);

    // 4. Set direct synchronous queue adapter for deterministic test flow
    const directQueue: IAutomationQueue = {
      async enqueue(msg) {
        await dispatcher.triggerProcessor(msg.eventId);
      },
    };
    setAutomationQueueOverride(directQueue);

    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValueOnce({ data: { executionId: "n8n-exec-999" } });

    // 5. Emit Matching Business Event
    const eventId = crypto.randomUUID();
    const dispatchedEvent = await dispatcher.dispatchEvent({
      workspaceId,
      eventId,
      eventType: "invoice.created",
      version: 1,
      payload: { invoice: { total: 75000, id: "inv-1" } },
      occurredAt: new Date().toISOString(),
    });

    expect(dispatchedEvent).toBeDefined();

    // 6. Verify Database Event & Run Status
    const dbEvents = Array.from(dbStore.automationEvents.values());
    expect(dbEvents.length).toBe(1);
    expect(dbEvents[0].status).toBe("dispatched");

    const runs = Array.from(dbStore.automationRuns.values());
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("running");
    expect(runs[0].n8nExecutionId).toBe("n8n-exec-999");

    // 7. Verify N8n Compiler produced correct conditions
    const compiler = (service as any).n8nCompiler;
    const compiled = compiler.compile(await repo.getAutomation(workspaceId, automation.id));
    const ifNode = compiled.nodes.find((n: any) => n.type === "n8n-nodes-base.if");
    expect(ifNode.parameters.conditions.number[0]).toEqual({
      value1: "={{$json.body.payload.invoice.total}}",
      operation: "larger",
      value2: "50000",
    });

    // 8. Verify action node contains automationRunId and targets internal action route
    const actionNode = compiled.nodes.find(
      (n: any) => n.type === "n8n-nodes-base.httpRequest"
    );
    expect(actionNode.parameters.url).toContain("/api/v1/internal/actions/send-email");
    expect(actionNode.parameters.jsonBody).toContain("automationRunId");
  });

  it("should enforce run-level idempotency on duplicate event delivery", async () => {
    // Setup automation
    const automation = await service.createAutomation({
      workspaceId,
      createdByUserId: "user-1",
      name: "Idempotent Automation",
      triggerType: "event",
      triggerConfig: { type: "event", eventType: "invoice.created" },
      conditionConfig: { operator: "AND", conditions: [] },
      actionConfig: [
        { type: "send_email", templateKey: "alert", recipient: "owner" },
      ],
      timezone: "UTC",
    });

    await service.activateAutomation(workspaceId, automation.id);

    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ data: { executionId: "exec-1" } });

    // Direct queue that processes inline
    const directQueue: IAutomationQueue = {
      async enqueue(msg) {
        await dispatcher.triggerProcessor(msg.eventId);
      },
    };
    setAutomationQueueOverride(directQueue);

    const eventId = "dup-event-1";
    const payload = {
      workspaceId,
      eventId,
      eventType: "invoice.created",
      version: 1,
      payload: { invoice: { id: "inv-dup" } },
      occurredAt: new Date().toISOString(),
    };

    // First dispatch
    await dispatcher.dispatchEvent(payload);

    // Second dispatch (duplicate eventId)
    await dispatcher.dispatchEvent(payload);

    const runs = Array.from(dbStore.automationRuns.values());
    expect(runs.length).toBe(1);
    expect(mockPost).toHaveBeenCalledTimes(1); // n8n webhook called only once!
  });

  it("should handle transient n8n failure with retry backoff and error classification", async () => {
    const automation = await service.createAutomation({
      workspaceId,
      createdByUserId: "user-1",
      name: "Failing Automation",
      triggerType: "event",
      triggerConfig: { type: "event", eventType: "invoice.created" },
      conditionConfig: { operator: "AND", conditions: [] },
      actionConfig: [
        { type: "send_email", templateKey: "alert", recipient: "owner" },
      ],
      timezone: "UTC",
    });

    await service.activateAutomation(workspaceId, automation.id);

    // Mock n8n 503 Service Unavailable
    const error503: any = new Error("Service Unavailable");
    error503.isAxiosError = true;
    error503.response = { status: 503, data: "Overloaded" };
    expect(isTransientError(error503)).toBe(true);

    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValueOnce(error503);

    const eventRecord = (
      await db
        .insert(automationEventsTable)
        .values({
          workspaceId,
          eventId: "transient-fail-event",
          eventType: "invoice.created",
          version: 1,
          payload: {},
          status: "pending",
          occurredAt: new Date(),
        })
        .returning()
    )[0];

    // Trigger processor directly
    await expect(dispatcher.triggerProcessor(eventRecord.id)).rejects.toThrow(
      "Service Unavailable"
    );

    const updatedEvent = dbStore.automationEvents.get(eventRecord.id);
    expect(updatedEvent.status).toBe("failed");
    expect(updatedEvent.attempts).toBe(1);
    expect(updatedEvent.nextAttemptAt).toBeDefined();

    const runs = Array.from(dbStore.automationRuns.values());
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("failed");
    expect(runs[0].errorCode).toBe("N8N_TRIGGER_TRANSIENT_FAILED");
  });

  it("should dead-letter event after reaching max retry attempts", async () => {
    const eventRecord = (
      await db
        .insert(automationEventsTable)
        .values({
          workspaceId,
          eventId: "dlq-event",
          eventType: "invoice.created",
          version: 1,
          payload: {},
          status: "failed",
          attempts: 2,
          occurredAt: new Date(),
        })
        .returning()
    )[0];

    const err = new Error("Permanent server crash");
    const updated = await dispatcher.handleFailure(eventRecord.id, err, 3, 3);

    expect(updated?.status).toBe("dead_lettered");
    expect(updated?.attempts).toBe(3);
    expect(updated?.lastError).toBe("Permanent server crash");
  });

  it("should sweep and re-dispatch retryable events", async () => {
    const pastDate = new Date(Date.now() - 60000);
    const eventRecord = (
      await db
        .insert(automationEventsTable)
        .values({
          workspaceId,
          eventId: "sweep-event",
          eventType: "invoice.created",
          version: 1,
          payload: {},
          status: "failed",
          nextAttemptAt: pastDate,
          occurredAt: new Date(),
        })
        .returning()
    )[0];

    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValueOnce({ data: { executionId: "swept-exec" } });

    const sweptCount = await dispatcher.sweepPendingOrRetryableEvents();
    expect(sweptCount).toBeGreaterThanOrEqual(1);
  });
});
