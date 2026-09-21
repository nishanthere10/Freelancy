import { db } from "../../db/client";
import { automationEventsTable } from "@repo/database";
import { AutomationEventV1 } from "./automation.events";
import { eq, and } from "drizzle-orm";

export class AutomationDispatcher {
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
      // In a full implementation, we'd trigger a background queue processor here.
      // For now we'll simulate immediate dispatch.
      // this.triggerProcessor(automationEvent.id);
    }

    return automationEvent;
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
