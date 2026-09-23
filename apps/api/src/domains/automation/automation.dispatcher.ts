import { db } from "../../db/client";
import { automationEventsTable } from "@repo/database";
import { AutomationEventV1 } from "./automation.events";
import { eq, and } from "drizzle-orm";

import { AutomationRepository } from "./automation.repository";
import axios from "axios";
import { logger } from "../../../utils/logger";

export class AutomationDispatcher {
  private repository = new AutomationRepository();

  /**
   * Records a domain event durably so that it can be processed by automations at-least-once.
   */
  async dispatchEvent(event: AutomationEventV1) {
    const [automationEvent] = await db
      .insert(automationEventsTable)
      .values({
        workspaceId: event.workspaceId,
        eventId: event.eventId,
        eventType: event.eventType,
        version: event.version,
        payload: event,
        status: "pending",
        occurredAt: new Date(event.occurredAt),
      })
      .onConflictDoNothing() // Idempotent on eventId
      .returning();

    if (automationEvent) {
      // Simulate immediate background dispatch for simplicity without heavy infra
      this.triggerProcessor(automationEvent.id).catch((err) => {
        logger.error("Background processor failed", { error: err });
      });
    }

    return automationEvent;
  }

  async triggerProcessor(eventId: string) {
    const [event] = await db.select().from(automationEventsTable).where(eq(automationEventsTable.id, eventId));
    if (!event || event.status !== "pending") return;
    
    try {
      const activeAutomations = await this.repository.getActiveAutomationsByTrigger(event.workspaceId, event.eventType);
      
      for (const automation of activeAutomations) {
        // Create automation run
        const run = await this.repository.createRun(event.workspaceId, automation.id, "event", event.id);
        
        // Trigger n8n webhook
        const n8nBase = process.env.N8N_BASE_URL ? process.env.N8N_BASE_URL.replace("/api/v1", "") : "http://localhost:5678";
        const webhookUrl = `${n8nBase}/webhook/automation-trigger-${automation.id}`;
        
        try {
          const res = await axios.post(webhookUrl, {
            runId: run.id,
            eventId: event.id,
            payload: event.payload
          });
          
          await this.repository.updateRunStatus(event.workspaceId, run.id, "running", res.data?.executionId);
        } catch (n8nErr: any) {
          logger.error("Failed to trigger n8n workflow", { error: n8nErr.message, automationId: automation.id });
          await this.repository.updateRunStatus(event.workspaceId, run.id, "failed", undefined, "N8N_TRIGGER_FAILED", n8nErr.message);
        }
      }

      await this.markDispatched(eventId);
    } catch (error: any) {
      await this.handleFailure(eventId, error, event.attempts + 1);
    }
  }

  /**
   * Fetches pending events for a workspace
   */
  async getPendingEvents(workspaceId: string, limit: number = 10) {
    return db
      .select()
      .from(automationEventsTable)
      .where(
        and(
          eq(automationEventsTable.workspaceId, workspaceId),
          eq(automationEventsTable.status, "pending")
        )
      )
      .limit(limit);
  }

  /**
   * Marks an event as successfully dispatched to n8n
   */
  async markDispatched(eventId: string) {
    const [updated] = await db
      .update(automationEventsTable)
      .set({
        status: "dispatched",
        dispatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(automationEventsTable.id, eventId))
      .returning();
    return updated;
  }

  /**
   * Handles a delivery failure to n8n. Implements exponential backoff.
   */
  async handleFailure(eventId: string, error: Error, attempt: number, maxAttempts: number = 3) {
    if (attempt >= maxAttempts) {
      const [updated] = await db
        .update(automationEventsTable)
        .set({
          status: "dead_lettered",
          lastError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(automationEventsTable.id, eventId))
        .returning();
      return updated;
    }

    // Next attempt: simple backoff (e.g. attempt^2 minutes)
    const nextAttemptAt = new Date(Date.now() + Math.pow(attempt, 2) * 60000);
    const [updated] = await db
      .update(automationEventsTable)
      .set({
        attempts: attempt,
        status: "failed", // still retryable
        lastError: error.message,
        nextAttemptAt,
        updatedAt: new Date(),
      })
      .where(eq(automationEventsTable.id, eventId))
      .returning();
    return updated;
  }
}
