import {
  type Invoice,
  type InvoiceItem,
  clientsTable,
  invoiceItemsTable,
  invoicesTable,
  projectsTable,
} from "@repo/database";
import { and, eq, ilike, isNotNull, isNull, max, or } from "drizzle-orm";
import { db } from "../../../db/client";
import type {
  CreateInvoiceItemRepositoryInput,
  CreateInvoiceRepositoryInput,
  InvoiceQueryFilters,
  InvoiceWithItems,
  UpdateInvoiceRepositoryInput,
} from "../invoice.types";

export class InvoiceRepository {
  async create(data: CreateInvoiceRepositoryInput): Promise<InvoiceWithItems> {
    if (!data.workspaceId) {
      throw new Error("Workspace ID is required");
    }
    if (!data.clientId) {
      throw new Error("Client ID is required");
    }
    if (!data.items || data.items.length === 0) {
      throw new Error("At least one line item is required");
    }

    try {
      return await db.transaction(async (tx) => {
        const [invoice] = await tx
          .insert(invoicesTable)
          .values({
            workspaceId: data.workspaceId,
            clientId: data.clientId,
            projectId: data.projectId || null,
            issueDate: data.issueDate || null,
            dueDate: data.dueDate || null,
            currency: data.currency?.toUpperCase().trim() || "INR",
            subtotal: data.subtotal || "0.00",
            discountRate: data.discountRate || "0.00",
            discountAmount: data.discountAmount || "0.00",
            taxableAmount: data.taxableAmount || "0.00",
            taxRate: data.taxRate || "18.00",
            taxAmount: data.taxAmount || "0.00",
            totalAmount: data.totalAmount || "0.00",
            amountPaid: data.amountPaid || "0.00",
            amountDue: data.amountDue || data.totalAmount || "0.00",
            status: "draft",
            notes: data.notes?.trim() || null,
            terms: data.terms?.trim() || null,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
          })
          .returning();

        if (!invoice) {
          throw new Error("Failed to create invoice header");
        }

        const insertedItems: InvoiceItem[] = [];
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const [insertedItem] = await tx
            .insert(invoiceItemsTable)
            .values({
              workspaceId: data.workspaceId,
              invoiceId: invoice.id,
              description: item.description.trim(),
              quantity: item.quantity || "1.00",
              unitPrice: item.unitPrice || "0.00",
              amount: item.amount || "0.00",
              sortOrder: item.sortOrder ?? i,
            })
            .returning();

          if (insertedItem) {
            insertedItems.push(insertedItem);
          }
        }

        // Fetch client and project names if available
        let clientName: string | null = null;
        let projectName: string | null = null;

        const [client] = await tx
          .select({ name: clientsTable.name })
          .from(clientsTable)
          .where(
            and(
              eq(clientsTable.id, data.clientId),
              eq(clientsTable.workspaceId, data.workspaceId),
            ),
          );
        if (client) clientName = client.name;

        if (data.projectId) {
          const [project] = await tx
            .select({ name: projectsTable.name })
            .from(projectsTable)
            .where(
              and(
                eq(projectsTable.id, data.projectId),
                eq(projectsTable.workspaceId, data.workspaceId),
              ),
            );
          if (project) projectName = project.name;
        }

        return {
          ...invoice,
          items: insertedItems,
          clientName,
          projectName,
        };
      });
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === "23503") {
        if (pgError.constraint === "fk_invoices_workspace_client") {
          throw new Error(
            "Client does not exist or does not belong to this workspace",
          );
        }
        if (pgError.constraint === "fk_invoices_workspace_project") {
          throw new Error(
            "Project does not exist or does not belong to this workspace",
          );
        }
      }
      throw error;
    }
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<InvoiceWithItems | null> {
    const conditions = [
      eq(invoicesTable.id, id),
      eq(invoicesTable.workspaceId, workspaceId),
    ];

    if (!options?.includeDeleted) {
      conditions.push(isNull(invoicesTable.deletedAt));
    }

    const [headerResult] = await db
      .select({
        invoice: invoicesTable,
        clientName: clientsTable.name,
        projectName: projectsTable.name,
      })
      .from(invoicesTable)
      .leftJoin(
        clientsTable,
        and(
          eq(invoicesTable.clientId, clientsTable.id),
          eq(invoicesTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .leftJoin(
        projectsTable,
        and(
          eq(invoicesTable.projectId, projectsTable.id),
          eq(invoicesTable.workspaceId, projectsTable.workspaceId),
        ),
      )
      .where(and(...conditions));

    if (!headerResult) return null;

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(
        and(
          eq(invoiceItemsTable.invoiceId, id),
          eq(invoiceItemsTable.workspaceId, workspaceId),
        ),
      )
      .orderBy(invoiceItemsTable.sortOrder);

    return {
      ...headerResult.invoice,
      items,
      clientName: headerResult.clientName || null,
      projectName: headerResult.projectName || null,
    };
  }

  async getByNumber(
    invoiceNumber: string,
    workspaceId: string,
  ): Promise<InvoiceWithItems | null> {
    const [headerResult] = await db
      .select({
        invoice: invoicesTable,
        clientName: clientsTable.name,
        projectName: projectsTable.name,
      })
      .from(invoicesTable)
      .leftJoin(
        clientsTable,
        and(
          eq(invoicesTable.clientId, clientsTable.id),
          eq(invoicesTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .leftJoin(
        projectsTable,
        and(
          eq(invoicesTable.projectId, projectsTable.id),
          eq(invoicesTable.workspaceId, projectsTable.workspaceId),
        ),
      )
      .where(
        and(
          eq(invoicesTable.invoiceNumber, invoiceNumber),
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      );

    if (!headerResult) return null;

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(
        and(
          eq(invoiceItemsTable.invoiceId, headerResult.invoice.id),
          eq(invoiceItemsTable.workspaceId, workspaceId),
        ),
      )
      .orderBy(invoiceItemsTable.sortOrder);

    return {
      ...headerResult.invoice,
      items,
      clientName: headerResult.clientName || null,
      projectName: headerResult.projectName || null,
    };
  }

  async list(filters: InvoiceQueryFilters): Promise<InvoiceWithItems[]> {
    const conditions = [eq(invoicesTable.workspaceId, filters.workspaceId)];

    if (filters.clientId) {
      conditions.push(eq(invoicesTable.clientId, filters.clientId));
    }

    if (filters.projectId) {
      conditions.push(eq(invoicesTable.projectId, filters.projectId));
    }

    if (filters.status && filters.status !== "all") {
      conditions.push(eq(invoicesTable.status, filters.status));
    }

    if (filters.excludeDeleted !== false) {
      conditions.push(isNull(invoicesTable.deletedAt));
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(invoicesTable.invoiceNumber, term),
        ilike(invoicesTable.notes, term),
        ilike(clientsTable.name, term),
        ilike(projectsTable.name, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const headers = await db
      .select({
        invoice: invoicesTable,
        clientName: clientsTable.name,
        projectName: projectsTable.name,
      })
      .from(invoicesTable)
      .leftJoin(
        clientsTable,
        and(
          eq(invoicesTable.clientId, clientsTable.id),
          eq(invoicesTable.workspaceId, clientsTable.workspaceId),
        ),
      )
      .leftJoin(
        projectsTable,
        and(
          eq(invoicesTable.projectId, projectsTable.id),
          eq(invoicesTable.workspaceId, projectsTable.workspaceId),
        ),
      )
      .where(and(...conditions))
      .orderBy(invoicesTable.createdAt);

    if (headers.length === 0) return [];

    const invoiceIds = headers.map((h) => h.invoice.id);
    const allItems = await db
      .select()
      .from(invoiceItemsTable)
      .where(and(eq(invoiceItemsTable.workspaceId, filters.workspaceId)));

    const itemsMap = new Map<string, InvoiceItem[]>();
    for (const item of allItems) {
      const list = itemsMap.get(item.invoiceId) || [];
      list.push(item);
      itemsMap.set(item.invoiceId, list);
    }

    return headers.map((h) => ({
      ...h.invoice,
      items: (itemsMap.get(h.invoice.id) || []).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
      clientName: h.clientName || null,
      projectName: h.projectName || null,
    }));
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateInvoiceRepositoryInput,
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    if (existing.status !== "draft") {
      throw new Error(
        `Cannot edit invoice ${id} because it is in '${existing.status}' status and is locked`,
      );
    }

    const updateData: Partial<typeof invoicesTable.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: data.updatedBy,
    };

    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.issueDate !== undefined) updateData.issueDate = data.issueDate;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.discountRate !== undefined)
      updateData.discountRate = data.discountRate;
    if (data.discountAmount !== undefined)
      updateData.discountAmount = data.discountAmount;
    if (data.taxableAmount !== undefined)
      updateData.taxableAmount = data.taxableAmount;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
    if (data.totalAmount !== undefined)
      updateData.totalAmount = data.totalAmount;
    if (data.amountPaid !== undefined) updateData.amountPaid = data.amountPaid;
    if (data.amountDue !== undefined) updateData.amountDue = data.amountDue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.status !== undefined) updateData.status = data.status;

    try {
      return await db.transaction(async (tx) => {
        const [updatedHeader] = await tx
          .update(invoicesTable)
          .set(updateData)
          .where(
            and(
              eq(invoicesTable.id, id),
              eq(invoicesTable.workspaceId, workspaceId),
              isNull(invoicesTable.deletedAt),
            ),
          )
          .returning();

        if (!updatedHeader) {
          throw new Error(`Invoice with ID ${id} not found or deleted`);
        }

        let items = existing.items;
        if (data.items) {
          await tx
            .delete(invoiceItemsTable)
            .where(
              and(
                eq(invoiceItemsTable.invoiceId, id),
                eq(invoiceItemsTable.workspaceId, workspaceId),
              ),
            );

          const insertedItems: InvoiceItem[] = [];
          for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            const [insertedItem] = await tx
              .insert(invoiceItemsTable)
              .values({
                workspaceId,
                invoiceId: id,
                description: item.description.trim(),
                quantity: item.quantity || "1.00",
                unitPrice: item.unitPrice || "0.00",
                amount: item.amount || "0.00",
                sortOrder: item.sortOrder ?? i,
              })
              .returning();

            if (insertedItem) {
              insertedItems.push(insertedItem);
            }
          }
          items = insertedItems;
        }

        return {
          ...updatedHeader,
          items,
          clientName: existing.clientName,
          projectName: existing.projectName,
        };
      });
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === "23503") {
        if (pgError.constraint === "fk_invoices_workspace_client") {
          throw new Error(
            "Client does not exist or does not belong to this workspace",
          );
        }
        if (pgError.constraint === "fk_invoices_workspace_project") {
          throw new Error(
            "Project does not exist or does not belong to this workspace",
          );
        }
      }
      throw error;
    }
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Invoice> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new Error(`Invoice with ID ${id} not found or already deleted`);
    }

    if (existing.status !== "draft") {
      throw new Error(
        `Cannot delete invoice ${id} because it is in '${existing.status}' status. Only draft invoices can be deleted`,
      );
    }

    const [deleted] = await db
      .update(invoicesTable)
      .set({
        deletedAt: new Date(),
        updatedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoicesTable.id, id),
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw new Error(`Invoice with ID ${id} not found or already deleted`);
    }

    return deleted;
  }

  async getNextSequenceNumber(workspaceId: string): Promise<number> {
    const [result] = await db
      .select({ maxSeq: max(invoicesTable.sequenceNumber) })
      .from(invoicesTable)
      .where(eq(invoicesTable.workspaceId, workspaceId));

    const currentMax = result?.maxSeq || 0;
    return currentMax + 1;
  }

  async issueInvoice(
    id: string,
    workspaceId: string,
    data: {
      invoiceNumber: string;
      sequenceNumber: number;
      issueDate?: string;
      dueDate?: string;
      updatedBy: string;
    },
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    if (existing.status !== "draft") {
      throw new Error(
        `Cannot send invoice ${id} because it is already in '${existing.status}' status`,
      );
    }

    try {
      const [updated] = await db
        .update(invoicesTable)
        .set({
          invoiceNumber: data.invoiceNumber,
          sequenceNumber: data.sequenceNumber,
          status: "sent",
          issueDate: data.issueDate || new Date().toISOString().split("T")[0],
          dueDate: data.dueDate || existing.dueDate,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoicesTable.id, id),
            eq(invoicesTable.workspaceId, workspaceId),
            isNull(invoicesTable.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`Invoice with ID ${id} not found`);
      }

      return {
        ...updated,
        items: existing.items,
        clientName: existing.clientName,
        projectName: existing.projectName,
      };
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "idx_invoices_workspace_number"
      ) {
        throw new Error(
          `Invoice number '${data.invoiceNumber}' already exists in workspace`,
        );
      }
      throw error;
    }
  }

  async recordPayment(
    id: string,
    workspaceId: string,
    data: {
      amountPaid: string;
      amountDue: string;
      paymentMethod?: string;
      paymentReference?: string;
      paidAt?: Date;
      updatedBy: string;
    },
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    if (existing.status !== "sent" && existing.status !== "overdue") {
      throw new Error(
        `Cannot record payment on invoice ${id} because it is in '${existing.status}' status`,
      );
    }

    const isFullyPaid = Number(data.amountDue) <= 0;
    const newStatus = isFullyPaid ? "paid" : existing.status;

    const [updated] = await db
      .update(invoicesTable)
      .set({
        amountPaid: data.amountPaid,
        amountDue: data.amountDue,
        paymentMethod: data.paymentMethod || existing.paymentMethod,
        paymentReference: data.paymentReference || existing.paymentReference,
        paidAt: isFullyPaid ? data.paidAt || new Date() : existing.paidAt,
        status: newStatus,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoicesTable.id, id),
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return {
      ...updated,
      items: existing.items,
      clientName: existing.clientName,
      projectName: existing.projectName,
    };
  }

  async cancelInvoice(
    id: string,
    workspaceId: string,
    cancelledBy: string,
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    if (existing.status === "cancelled") {
      throw new Error(`Invoice ${id} is already cancelled`);
    }

    const [updated] = await db
      .update(invoicesTable)
      .set({
        status: "cancelled",
        updatedBy: cancelledBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoicesTable.id, id),
          eq(invoicesTable.workspaceId, workspaceId),
          isNull(invoicesTable.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return {
      ...updated,
      items: existing.items,
      clientName: existing.clientName,
      projectName: existing.projectName,
    };
  }
}
