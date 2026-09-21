import crypto from "crypto";
import { db } from "../../db/client";
import { automationActionRunsTable } from "@repo/database";
import { and, eq } from "drizzle-orm";

export class AutomationIdempotencyService {
  /**
   * Generates a stable idempotency key for an action execution
   */
  generateKey(
    workspaceId: string,
    automationId: string,
    sourceEventId: string,
    actionIndex: number,
    definitionVersion: number
  ): string {
    const payload = `${workspaceId}:${automationId}:${sourceEventId}:${actionIndex}:${definitionVersion}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Checks if an action has already been successfully executed for this idempotency key
   */
  async getExistingActionRun(workspaceId: string, idempotencyKey: string) {
    const [actionRun] = await db
      .select()
      .from(automationActionRunsTable)
      .where(
        and(
          eq(automationActionRunsTable.workspaceId, workspaceId),
          eq(automationActionRunsTable.idempotencyKey, idempotencyKey)
        )
      );

    return actionRun;
  }

  /**
   * Records the start of an action execution to prevent concurrent duplicates
   */
  async recordActionStart(
    workspaceId: string,
    automationRunId: string,
    actionIndex: number,
    actionType: string,
    idempotencyKey: string
  ) {
    const [actionRun] = await db
      .insert(automationActionRunsTable)
      .values({
        workspaceId,
        automationRunId,
        actionIndex,
        actionType,
        idempotencyKey,
        status: "running",
        startedAt: new Date(),
      })
      // If it exists, we just return the existing one. 
      // PostgreSQL handles uniqueness via the (workspaceId, idempotencyKey) constraint.
      .onConflictDoNothing()
      .returning();

    return actionRun;
  }

  /**
   * Records the result of an action execution
   */
  async recordActionResult(
    workspaceId: string,
    idempotencyKey: string,
    status: "succeeded" | "failed" | "skipped",
    providerMessageId?: string,
    errorCode?: string,
    errorMessage?: string
  ) {
    const [updated] = await db
      .update(automationActionRunsTable)
      .set({
        status,
        providerMessageId,
        errorCode,
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(automationActionRunsTable.workspaceId, workspaceId),
          eq(automationActionRunsTable.idempotencyKey, idempotencyKey)
        )
      )
      .returning();

    return updated;
  }
}
