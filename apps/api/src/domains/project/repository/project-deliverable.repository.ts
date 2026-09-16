import {
  type CreateProjectDeliverableInput,
  type ProjectDeliverable,
  projectDeliverablesTable,
} from "@repo/database";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/client";

export class ProjectDeliverableRepository {
  async create(
    data: CreateProjectDeliverableInput,
  ): Promise<ProjectDeliverable> {
    const [deliverable] = await db
      .insert(projectDeliverablesTable)
      .values(data)
      .returning();

    if (!deliverable) {
      throw new Error("Failed to insert project deliverable");
    }

    return deliverable;
  }

  async createMany(
    data: CreateProjectDeliverableInput[],
  ): Promise<ProjectDeliverable[]> {
    if (!data.length) return [];

    const deliverables = await db
      .insert(projectDeliverablesTable)
      .values(data)
      .returning();

    return deliverables;
  }

  async getById(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<ProjectDeliverable | null> {
    const [deliverable] = await db
      .select()
      .from(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.id, id),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      );

    return deliverable || null;
  }

  async listByProject(
    projectId: string,
    workspaceId: string,
  ): Promise<ProjectDeliverable[]> {
    return db
      .select()
      .from(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .orderBy(
        asc(projectDeliverablesTable.position),
        asc(projectDeliverablesTable.createdAt),
      );
  }

  async update(
    id: string,
    projectId: string,
    workspaceId: string,
    data: Partial<CreateProjectDeliverableInput>,
  ): Promise<ProjectDeliverable | null> {
    const [updated] = await db
      .update(projectDeliverablesTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectDeliverablesTable.id, id),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    return updated || null;
  }

  async delete(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const [deleted] = await db
      .delete(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.id, id),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    return Boolean(deleted);
  }

  async deleteByProject(
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const deleted = await db
      .delete(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    return deleted.length;
  }

  /**
   * Concurrency Guard: Atomically claims completed deliverables for an invoice.
   * Only transitions deliverables where status = 'completed' AND billed_at IS NULL.
   */
  async atomicClaimBilled(
    deliverableIds: string[],
    projectId: string,
    workspaceId: string,
    invoiceId: string,
  ): Promise<ProjectDeliverable[]> {
    if (!deliverableIds.length) return [];

    const updated = await db
      .update(projectDeliverablesTable)
      .set({
        billedAt: new Date(),
        invoiceId,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(projectDeliverablesTable.id, deliverableIds),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
          eq(projectDeliverablesTable.status, "completed"),
          isNull(projectDeliverablesTable.billedAt),
        ),
      )
      .returning();

    return updated;
  }

  async unbillByInvoiceId(
    invoiceId: string,
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const updated = await db
      .update(projectDeliverablesTable)
      .set({
        billedAt: null,
        invoiceId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectDeliverablesTable.invoiceId, invoiceId),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    return updated.length;
  }

  async getMaxPosition(
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const [result] = await db
      .select({
        maxPos: sql<number>`COALESCE(MAX(${projectDeliverablesTable.position}), 0)::int`,
      })
      .from(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      );

    return result?.maxPos ?? 0;
  }

  async deleteByChangeOrderId(
    changeOrderId: string,
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const deleted = await db
      .delete(projectDeliverablesTable)
      .where(
        and(
          eq(projectDeliverablesTable.changeOrderId, changeOrderId),
          eq(projectDeliverablesTable.projectId, projectId),
          eq(projectDeliverablesTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    return deleted.length;
  }
}

export const projectDeliverableRepo = new ProjectDeliverableRepository();
