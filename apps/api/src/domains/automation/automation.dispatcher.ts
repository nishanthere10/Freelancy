import { db } from "../../db/client";
import { automationEventsTable } from "@repo/database";
import { AutomationEventV1 } from "./automation.events";
import { eq, and, lte } from "drizzle-orm";
import { AutomationRepository } from "./automation.repository";
import axios, { AxiosError } from "axios";
import { logger } from "../../utils/logger";
import {
  getAutomationQueue,
  registerAutomationProcessor,
} from "./automation.queue";

export function isTransientError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 500) return true;
    if (status === 429) return true;
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNRESET"
    ) {
      return true;
    }
    // Network errors without response are transient
    if (!error.response) return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("network") ||
      msg.includes("rate limit")
    ) {
      return true;
    }
  }
  return false;
}

export class AutomationDispatcher {
  private repository = new AutomationRepository();

  constructor() {
    registerAutomationProcessor((eventId) => this.triggerProcessor(eventId));
  }

  /**
   * Records a domain event durably so that it can be processed by automations at-least-once.
   * Dispatches via durable queue or worker execution context without unawaited request-bound promises.
   */
  async dispatchEvent(event: AutomationEventV1) {
    const [inserted] = await db
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
      .onConflictDoNothing()
      .returning();

    const targetEvent =
      inserted ??
      (
        await db
          .select()
          .from(automationEventsTable)
          .where(eq(automationEventsTable.eventId, event.eventId))
      )[0];

    if (targetEvent && (targetEvent.status === "pending" || targetEvent.status === "failed")) {
      const queue = getAutomationQueue();
      await queue.enqueue({
        eventId: targetEvent.id,
        workspaceId: targetEvent.workspaceId,
        eventType: targetEvent.eventType,
        attempt: targetEvent.attempts || 0,
        enqueuedAt: new Date().toISOString(),
      });
    }

    return targetEvent;
  }

  async triggerProcessor(eventId: string): Promise<void> {
    const [event] = await db
      .select()
      .from(automationEventsTable)
      .where(eq(automationEventsTable.id, eventId));

    if (!event || (event.status !== "pending" && event.status !== "failed")) {
      return;
    }

    let hasTransientFailure = false;
    let lastTransientError: Error | null = null;

    try {
      const activeAutomations =
        await this.repository.getActiveAutomationsByTrigger(
          event.workspaceId,
          event.eventType
        );

      for (const automation of activeAutomations) {
        // Idempotent run creation
        const run = await this.repository.createRun(
          event.workspaceId,
          automation.id,
          "event",
          event.id
        );

        if (!run) continue;

        // Skip re-dispatching if already succeeded or running
        if (run.status === "succeeded" || run.status === "running") {
          continue;
        }

        const n8nBase = process.env.N8N_BASE_URL
          ? process.env.N8N_BASE_URL.replace("/api/v1", "")
          : "http://localhost:5678";
        const webhookUrl = `${n8nBase}/webhook/automation-trigger-${automation.id}`;

        try {
          const res = await axios.post(
            webhookUrl,
            {
              runId: run.id,
              eventId: event.id,
              workspaceId: event.workspaceId,
              automationId: automation.id,
              definitionVersion: automation.definitionVersion || 1,
              payload: event.payload,
            },
            { timeout: 10000 }
          );

          await this.repository.updateRunStatus(
            event.workspaceId,
            run.id,
            "running",
            res.data?.executionId
          );
        } catch (n8nErr: any) {
          const isTransient = isTransientError(n8nErr);
          const errorCode = isTransient
            ? "N8N_TRIGGER_TRANSIENT_FAILED"
            : "N8N_TRIGGER_FAILED";

          logger.error("Failed to trigger n8n workflow", {
            error: n8nErr.message,
            automationId: automation.id,
            runId: run.id,
            isTransient,
          });

          await this.repository.updateRunStatus(
            event.workspaceId,
            run.id,
            "failed",
            undefined,
            errorCode,
            n8nErr.message
          );

          if (isTransient) {
            hasTransientFailure = true;
            lastTransientError = n8nErr instanceof Error ? n8nErr : new Error(String(n8nErr));
          }
        }
      }

      if (hasTransientFailure && lastTransientError) {
        await this.handleFailure(eventId, lastTransientError, event.attempts + 1);
        throw lastTransientError;
      }

      await this.markDispatched(eventId);
    } catch (error: any) {
      if (!hasTransientFailure) {
        await this.handleFailure(
          eventId,
          error instanceof Error ? error : new Error(String(error)),
          event.attempts + 1
        );
      }
      throw error;
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
  async handleFailure(
    eventId: string,
    error: Error,
    attempt: number,
    maxAttempts: number = 3
  ) {
    if (attempt >= maxAttempts) {
      const [updated] = await db
        .update(automationEventsTable)
        .set({
          status: "dead_lettered",
          attempts: attempt,
          lastError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(automationEventsTable.id, eventId))
        .returning();
      return updated;
    }

    // Next attempt: exponential backoff (attempt^2 minutes)
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

  /**
   * Sweeps and re-dispatches retryable failed events whose backoff expired
   * or stuck pending events. Can be invoked by Cloudflare Cron Trigger or background worker.
   */
  async sweepPendingOrRetryableEvents(limit: number = 20): Promise<number> {
    const now = new Date();
    const retryableEvents = await db
      .select()
      .from(automationEventsTable)
      .where(
        and(
          eq(automationEventsTable.status, "failed"),
          lte(automationEventsTable.nextAttemptAt, now)
        )
      )
      .limit(limit);

    const stuckPendingThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const stuckPending = await db
      .select()
      .from(automationEventsTable)
      .where(
        and(
          eq(automationEventsTable.status, "pending"),
          lte(automationEventsTable.createdAt, stuckPendingThreshold)
        )
      )
      .limit(limit);

    const eventsToProcess = [...retryableEvents, ...stuckPending];
    for (const item of eventsToProcess) {
      try {
        await this.triggerProcessor(item.id);
      } catch (err) {
        logger.warn("Sweeper failed to re-process event", {
          eventId: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return eventsToProcess.length;
  }
}
