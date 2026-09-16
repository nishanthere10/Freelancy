import { type ChangeOrder, changeOrdersTable } from "@repo/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client";

export class ChangeOrderRepository {
  async create(
    data: typeof changeOrdersTable.$inferInsert,
  ): Promise<ChangeOrder> {
    const [changeOrder] = await db
      .insert(changeOrdersTable)
      .values(data)
      .returning();

    if (!changeOrder) {
      throw new Error("Failed to insert change order");
    }

    return changeOrder;
  }

  async getById(
    id: string,
    projectId: string,
    workspaceId: string,
  ): Promise<ChangeOrder | null> {
    const [changeOrder] = await db
      .select()
      .from(changeOrdersTable)
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
        ),
      );

    return changeOrder || null;
  }

  async listByProject(
    projectId: string,
    workspaceId: string,
  ): Promise<ChangeOrder[]> {
    return db
      .select()
      .from(changeOrdersTable)
      .where(
        and(
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(changeOrdersTable.createdAt));
  }

  async getNextChangeOrderNumber(
    projectId: string,
    workspaceId: string,
  ): Promise<string> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(changeOrdersTable)
      .where(
        and(
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
        ),
      );

    const nextNumber = (result?.count || 0) + 1;
    return `CO-${String(nextNumber).padStart(3, "0")}`;
  }

  async updateDraft(
    id: string,
    projectId: string,
    workspaceId: string,
    data: Partial<typeof changeOrdersTable.$inferInsert>,
  ): Promise<ChangeOrder | null> {
    const [updated] = await db
      .update(changeOrdersTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
          eq(changeOrdersTable.status, "draft"),
        ),
      )
      .returning();

    return updated || null;
  }

  async atomicClaimApproved(
    id: string,
    projectId: string,
    workspaceId: string,
    actorUserId: string,
  ): Promise<ChangeOrder | null> {
    const [claimed] = await db
      .update(changeOrdersTable)
      .set({
        status: "approved",
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
          eq(changeOrdersTable.status, "draft"),
        ),
      )
      .returning();

    return claimed || null;
  }

  async revertStatus(
    id: string,
    projectId: string,
    workspaceId: string,
    status: "draft" | "cancelled" | "rejected",
  ): Promise<ChangeOrder> {
    const [reverted] = await db
      .update(changeOrdersTable)
      .set({
        status,
        approvedByUserId: null,
        approvedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    if (!reverted) {
      throw new Error(`Failed to revert change order status to '${status}'`);
    }

    return reverted;
  }

  async updateStatus(
    id: string,
    projectId: string,
    workspaceId: string,
    status: "rejected" | "cancelled",
  ): Promise<ChangeOrder | null> {
    const [updated] = await db
      .update(changeOrdersTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
          eq(changeOrdersTable.status, "draft"),
        ),
      )
      .returning();

    return updated || null;
  }

  async linkInvoice(
    id: string,
    projectId: string,
    workspaceId: string,
    invoiceId: string,
  ): Promise<ChangeOrder> {
    const [updated] = await db
      .update(changeOrdersTable)
      .set({
        invoiceId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrdersTable.id, id),
          eq(changeOrdersTable.projectId, projectId),
          eq(changeOrdersTable.workspaceId, workspaceId),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Failed to link invoice to change order");
    }

    return updated;
  }
}
