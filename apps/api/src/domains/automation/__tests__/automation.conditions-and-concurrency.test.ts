import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

const dbStore = {
  automations: new Map<string, any>(),
  automationEvents: new Map<string, any>(),
  automationRuns: new Map<string, any>(),
  automationActionRuns: new Map<string, any>(),
};

function resetDbStore() {
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
  return dbStore.automations;
}

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
            if (store === dbStore.automationEvents && data.eventId) {
              for (const existing of store.values()) {
                if (existing.eventId === data.eventId) return [];
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
            if (store === dbStore.automationActionRuns && data.workspaceId && data.idempotencyKey) {
              for (const existing of store.values()) {
                if (
                  existing.workspaceId === data.workspaceId &&
                  existing.idempotencyKey === data.idempotencyKey
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

    select: () => ({
      from: (table: any) => {
        const store = getStoreForTable(table);
        return {
          where: (_predicate: any) => {
            const rows = Array.from(store.values());
            return {
              limit: (lim: number) => Promise.resolve(rows.slice(0, lim)),
              orderBy: () => Promise.resolve(rows),
              then: (res: any) => Promise.resolve(rows).then(res),
            };
          },
          limit: (lim: number) => Promise.resolve(Array.from(store.values()).slice(0, lim)),
          then: (res: any) => Promise.resolve(Array.from(store.values())).then(res),
        };
      },
    }),

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

vi.mock("axios");
vi.mock("../../communication/communication.service");

import { N8nWorkflowCompiler } from "../n8n/n8n.workflow.compiler";
import { AutomationRepository } from "../automation.repository";
import { AutomationDispatcher } from "../automation.dispatcher";
import { AutomationIdempotencyService } from "../automation.idempotency";
import { setAutomationQueueOverride } from "../automation.queue";

describe("Sprint 20 Condition Compiler & Concurrency Verification", () => {
  const compiler = new N8nWorkflowCompiler();
  const repo = new AutomationRepository();
  const idempotencyService = new AutomationIdempotencyService();
  const workspaceId = "ws-test-cond";

  beforeEach(() => {
    resetDbStore();
    setAutomationQueueOverride(null);
    vi.clearAllMocks();
  });

  describe("Dynamic Condition Compilation", () => {
    it("correctly compiles numeric operators: gt, gte, lt, lte, eq", () => {
      const compiled = compiler.compile({
        id: "auto-1",
        workspaceId,
        name: "Numeric Conditions Test",
        triggerType: "event",
        triggerConfig: { type: "event", eventType: "invoice.created" },
        conditionConfig: {
          operator: "AND",
          conditions: [
            { field: "invoice.total", operator: "gt", value: 1000 },
            { field: "invoice.tax", operator: "gte", value: 100 },
            { field: "invoice.discount", operator: "lt", value: 50 },
            { field: "invoice.itemsCount", operator: "lte", value: 10 },
            { field: "invoice.version", operator: "eq", value: 1 },
          ],
        },
        actionConfig: [],
        timezone: "UTC",
        definitionVersion: 1,
      } as any);

      const ifNode = compiled.nodes.find((n) => n.type === "n8n-nodes-base.if");
      expect(ifNode).toBeDefined();
      expect(ifNode.parameters.combineOperation).toBe("all");

      const numConds = ifNode.parameters.conditions.number;
      expect(numConds).toHaveLength(5);
      expect(numConds[0]).toEqual({
        value1: "={{$json.body.payload.invoice.total}}",
        operation: "larger",
        value2: "1000",
      });
      expect(numConds[1]).toEqual({
        value1: "={{$json.body.payload.invoice.tax}}",
        operation: "largerEqual",
        value2: "100",
      });
      expect(numConds[2]).toEqual({
        value1: "={{$json.body.payload.invoice.discount}}",
        operation: "smaller",
        value2: "50",
      });
      expect(numConds[3]).toEqual({
        value1: "={{$json.body.payload.invoice.itemsCount}}",
        operation: "smallerEqual",
        value2: "10",
      });
      expect(numConds[4]).toEqual({
        value1: "={{$json.body.payload.invoice.version}}",
        operation: "equal",
        value2: "1",
      });
    });

    it("correctly compiles string operators: eq, neq, contains and OR combine", () => {
      const compiled = compiler.compile({
        id: "auto-2",
        workspaceId,
        name: "String OR Conditions Test",
        triggerType: "event",
        triggerConfig: { type: "event", eventType: "project.updated" },
        conditionConfig: {
          operator: "OR",
          conditions: [
            { field: "project.status", operator: "eq", value: "active" },
            { field: "project.category", operator: "neq", value: "archived" },
            { field: "project.title", operator: "contains", value: "Urgent" },
          ],
        },
        actionConfig: [],
        timezone: "UTC",
        definitionVersion: 1,
      } as any);

      const ifNode = compiled.nodes.find((n) => n.type === "n8n-nodes-base.if");
      expect(ifNode.parameters.combineOperation).toBe("any");

      const strConds = ifNode.parameters.conditions.string;
      expect(strConds).toHaveLength(3);
      expect(strConds[0]).toEqual({
        value1: "={{$json.body.payload.project.status}}",
        operation: "equal",
        value2: "active",
      });
      expect(strConds[1]).toEqual({
        value1: "={{$json.body.payload.project.category}}",
        operation: "notEqual",
        value2: "archived",
      });
      expect(strConds[2]).toEqual({
        value1: "={{$json.body.payload.project.title}}",
        operation: "contains",
        value2: "Urgent",
      });
    });

    it("correctly compiles boolean conditions", () => {
      const compiled = compiler.compile({
        id: "auto-3",
        workspaceId,
        name: "Boolean Conditions Test",
        triggerType: "event",
        triggerConfig: { type: "event", eventType: "client.created" },
        conditionConfig: {
          operator: "AND",
          conditions: [{ field: "client.isVip", operator: "eq", value: true }],
        },
        actionConfig: [],
        timezone: "UTC",
        definitionVersion: 1,
      } as any);

      const ifNode = compiled.nodes.find((n) => n.type === "n8n-nodes-base.if");
      const boolConds = ifNode.parameters.conditions.boolean;
      expect(boolConds).toHaveLength(1);
      expect(boolConds[0]).toEqual({
        value1: "={{$json.body.payload.client.isVip}}",
        operation: "equal",
        value2: true,
      });
    });
  });

  describe("Concurrency & Idempotency Hardening", () => {
    it("generates deterministic SHA-256 keys across identical action executions", () => {
      const key1 = idempotencyService.generateKey("ws-1", "auto-1", "event-1", 0, 1);
      const key2 = idempotencyService.generateKey("ws-1", "auto-1", "event-1", 0, 1);
      const keyDiffVersion = idempotencyService.generateKey("ws-1", "auto-1", "event-1", 0, 2);
      const keyDiffIndex = idempotencyService.generateKey("ws-1", "auto-1", "event-1", 1, 1);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex string length
      expect(key1).not.toBe(keyDiffVersion);
      expect(key1).not.toBe(keyDiffIndex);
    });

    it("handles concurrent createRun invocations without duplicate runs", async () => {
      const automationId = "auto-concurrent-1";
      const eventId = "event-concurrent-1";

      const [run1, run2, run3] = await Promise.all([
        repo.createRun(workspaceId, automationId, "event", eventId),
        repo.createRun(workspaceId, automationId, "event", eventId),
        repo.createRun(workspaceId, automationId, "event", eventId),
      ]);

      const runsInDb = Array.from(dbStore.automationRuns.values());
      expect(runsInDb).toHaveLength(1);
      expect(run1).toBeDefined();
    });

    it("handles concurrent action starts with identical idempotencyKey", async () => {
      const runId = "run-concurrent-1";
      const idempotencyKey = "sha256-idemp-concurrent-key-1";

      const [action1, action2] = await Promise.all([
        idempotencyService.recordActionStart(workspaceId, runId, 0, "send_email", idempotencyKey),
        idempotencyService.recordActionStart(workspaceId, runId, 0, "send_email", idempotencyKey),
      ]);

      const actionRunsInDb = Array.from(dbStore.automationActionRuns.values());
      expect(actionRunsInDb).toHaveLength(1);
    });

    it("handles concurrent dispatchEvent calls for identical eventId", async () => {
      const dispatcher = new AutomationDispatcher();
      const eventId = "event-concurrent-dispatch-1";

      const eventPayload = {
        workspaceId,
        eventId,
        eventType: "invoice.created",
        version: 1,
        payload: { invoice: { id: "inv-c1" } },
        occurredAt: new Date().toISOString(),
      };

      const [d1, d2] = await Promise.all([
        dispatcher.dispatchEvent(eventPayload),
        dispatcher.dispatchEvent(eventPayload),
      ]);

      const eventsInDb = Array.from(dbStore.automationEvents.values());
      expect(eventsInDb).toHaveLength(1);
      expect(d1.id).toBe(d2.id);
    });
  });
});
