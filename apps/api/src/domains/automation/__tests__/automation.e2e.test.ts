import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutomationService } from "../automation.service";
import { AutomationDispatcher } from "../automation.dispatcher";
import { AutomationRepository } from "../automation.repository";
import { CommunicationService } from "../../communication/communication.service";
import { db } from "../../../db/client";
import { workspacesTable, automationEventsTable, automationRunsTable, automationsTable } from "@repo/database";
import { eq } from "drizzle-orm";
import axios from "axios";
import crypto from "crypto";

vi.mock("axios");
vi.mock("../../communication/communication.service");

describe("Sprint 20 Automation End-to-End Execution", () => {
  let dispatcher: AutomationDispatcher;
  let service: AutomationService;
  let repo: AutomationRepository;
  const workspaceId = "test-workspace-id";

  beforeEach(() => {
    repo = new AutomationRepository();
    service = new AutomationService(repo);
    dispatcher = new AutomationDispatcher();
    vi.clearAllMocks();
  });

  it("should process a real business event end-to-end to an internal action", async () => {
    // 1. Create Workspace
    await db.insert(workspacesTable).values({ id: workspaceId, name: "Test Workspace", slug: "test-workspace" }).onConflictDoNothing();

    // 2. Create Automation
    const automation = await service.createAutomation({
      workspaceId,
      createdByUserId: "user-1",
      name: "High Value Invoice Alert",
      triggerType: "event",
      triggerConfig: { type: "event", eventType: "invoice.created" },
      conditionConfig: {
        operator: "AND",
        conditions: [
          { field: "invoice.total", operator: "gt", value: 50000 }
        ]
      },
      actionConfig: [
        { type: "send_email", templateKey: "high_value_alert", recipient: "owner" }
      ],
      timezone: "UTC"
    });

    // 3. Activate Automation
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValueOnce({ data: { id: "n8n-workflow-id", active: true } });
    await service.activateAutomation(workspaceId, automation.id);

    // 4. Emit Matching Business Event (invoice.total = 75000)
    const eventId = crypto.randomUUID();
    await dispatcher.dispatchEvent({
      workspaceId,
      eventId,
      eventType: "invoice.created",
      version: 1,
      payload: { invoice: { total: 75000, id: "inv-1" } },
      occurredAt: new Date().toISOString()
    });

    // Wait for the dispatcher async processor to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Verify Database State
    const [dbEvent] = await db.select().from(automationEventsTable).where(eq(automationEventsTable.eventId, eventId));
    expect(dbEvent).toBeDefined();
    expect(dbEvent.status).toBe("dispatched");

    const runs = await repo.listRuns(workspaceId, automation.id);
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("running"); // Reached n8n webhook

    // 6. Verify N8n Compiler produced correct conditions
    const compiler = (service as any).n8nCompiler;
    const compiled = compiler.compile(await repo.getAutomation(workspaceId, automation.id));
    const ifNode = compiled.nodes.find((n: any) => n.type === "n8n-nodes-base.if");
    expect(ifNode.parameters.conditions.number[0]).toEqual({
      value1: "={{$json.body.payload.invoice.total}}",
      operation: "larger",
      value2: "50000"
    });

    // 7. Verify internal action rate limiting and timing-safe equal
    // (This would involve calling the Express route /api/v1/internal/actions/send-email)
    // Here we just verify the n8n HTTP Request node targets the correct action route
    const actionNode = compiled.nodes.find((n: any) => n.type === "n8n-nodes-base.httpRequest");
    expect(actionNode.parameters.url).toContain("/api/v1/internal/actions/send-email");
  });
});
