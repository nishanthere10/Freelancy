import { and, desc, eq } from "drizzle-orm";
import {
  Automation,
  automationsTable,
  AutomationRun,
  automationRunsTable,
  AutomationEvent,
  automationEventsTable,
  AutomationActionRun,
  automationActionRunsTable,
} from "@repo/database";
import { db } from "../../db/client";
import {
  CreateAutomationInput,
  UpdateAutomationInput,
} from "./automation.types";

export class AutomationRepository {
  /**
   * Automations
   */
  async createAutomation(input: CreateAutomationInput) {
    const [automation] = await db
      .insert(automationsTable)
      .values({
        workspaceId: input.workspaceId,
        createdByUserId: input.createdByUserId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        conditionConfig: input.conditionConfig,
        actionConfig: input.actionConfig,
        timezone: input.timezone,
        definitionHash: this.computeDefinitionHash(input),
        status: "draft",
      })
      .returning();

    return automation;
  }

  async getAutomation(workspaceId: string, automationId: string) {
    const [automation] = await db
      .select()
      .from(automationsTable)
      .where(
        and(
          eq(automationsTable.id, automationId),
          eq(automationsTable.workspaceId, workspaceId)
        )
      );
    return automation;
  }

  async listAutomations(workspaceId: string) {
    return db
      .select()
      .from(automationsTable)
      .where(eq(automationsTable.workspaceId, workspaceId))
      .orderBy(desc(automationsTable.createdAt));
  }

  async getActiveAutomationsByTrigger(workspaceId: string, eventType: string) {
    const automations = await db
      .select()
      .from(automationsTable)
      .where(
        and(
          eq(automationsTable.workspaceId, workspaceId),
          eq(automationsTable.status, "active"),
          eq(automationsTable.triggerType, "event")
        )
      );

    // Filter by actual eventType inside JSON config
    return automations.filter(
      (a: any) =>
        a.triggerConfig &&
        a.triggerConfig.type === "event" &&
        a.triggerConfig.eventType === eventType
    );
  }

  async updateAutomation(
    workspaceId: string,
    automationId: string,
    input: UpdateAutomationInput
  ) {
    const [updated] = await db
      .update(automationsTable)
      .set({
        ...input,
        updatedAt: new Date(),
        // Note: definition hash and version update logic will be in service layer
      })
      .where(
        and(
          eq(automationsTable.id, automationId),
          eq(automationsTable.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated;
  }

  async updateStatus(
    workspaceId: string,
    automationId: string,
    status: typeof automationsTable.$inferSelect.status
  ) {
    const [updated] = await db
      .update(automationsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(automationsTable.id, automationId),
          eq(automationsTable.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated;
  }

  async updateN8nWorkflow(
    workspaceId: string,
    automationId: string,
    n8nWorkflowId: string,
    n8nWorkflowVersion: string
  ) {
    const [updated] = await db
      .update(automationsTable)
      .set({
        n8nWorkflowId,
        n8nWorkflowVersion,
        lastCompiledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(automationsTable.id, automationId),
          eq(automationsTable.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated;
  }

  /**
   * Automation Runs
   */
  async createRun(
    workspaceId: string,
    automationId: string,
    triggerSource: string,
    automationEventId?: string
  ) {
    const [run] = await db
      .insert(automationRunsTable)
      .values({
        workspaceId,
        automationId,
        triggerSource,
        automationEventId,
        status: "queued",
      })
      .returning();
    return run;
  }

  async updateRunStatus(
    workspaceId: string,
    runId: string,
    status: typeof automationRunsTable.$inferSelect.status,
    n8nExecutionId?: string,
    errorCode?: string,
    errorMessage?: string
  ) {
    const now = new Date();
    const updateData: any = {
      status,
      updatedAt: now,
    };
    if (n8nExecutionId) updateData.n8nExecutionId = n8nExecutionId;
    if (errorCode) updateData.errorCode = errorCode;
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (status === "running") updateData.startedAt = now;
    if (["succeeded", "failed", "skipped", "cancelled"].includes(status)) {
      updateData.completedAt = now;
    }

    const [updated] = await db
      .update(automationRunsTable)
      .set(updateData)
      .where(
        and(
          eq(automationRunsTable.id, runId),
          eq(automationRunsTable.workspaceId, workspaceId)
        )
      )
      .returning();
    return updated;
  }

  async listRuns(workspaceId: string, automationId: string) {
    return db
      .select()
      .from(automationRunsTable)
      .where(
        and(
          eq(automationRunsTable.workspaceId, workspaceId),
          eq(automationRunsTable.automationId, automationId)
        )
      )
      .orderBy(desc(automationRunsTable.createdAt));
  }

  /**
   * Internal helpers
   */
  computeDefinitionHash(input: any): string {
    // A stable serialization of trigger, conditions, actions, timezone.
    // In a real implementation this would use crypto.createHash('sha256').
    const payload = JSON.stringify({
      triggerConfig: input.triggerConfig,
      conditionConfig: input.conditionConfig,
      actionConfig: input.actionConfig,
      timezone: input.timezone,
    });
    return Buffer.from(payload).toString("base64"); // simple mock hash
  }
}
