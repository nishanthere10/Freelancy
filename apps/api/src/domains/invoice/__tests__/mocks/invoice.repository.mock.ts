import type { Invoice, InvoiceItem } from "@repo/database";
import type {
  CreateInvoiceRepositoryInput,
  InvoiceQueryFilters,
  InvoiceWithItems,
  UpdateInvoiceRepositoryInput,
} from "../../invoice.types";
import type { InvoiceRepository } from "../../repository/invoice.repository";

export class FakeInvoiceRepository implements Partial<InvoiceRepository> {
  private invoices: Map<string, Invoice> = new Map();
  private items: Map<string, InvoiceItem[]> = new Map();
  private clientNames: Map<string, string> = new Map();
  private projectNames: Map<string, string> = new Map();
  private nextId = 1;
  private nextItemId = 1;

  setClient(id: string, name: string) {
    this.clientNames.set(id, name);
  }

  setProject(id: string, name: string) {
    this.projectNames.set(id, name);
  }

  async create(data: CreateInvoiceRepositoryInput): Promise<InvoiceWithItems> {
    if (!data.workspaceId) throw new Error("Workspace ID is required");
    if (!data.clientId) throw new Error("Client ID is required");
    if (!data.items || data.items.length === 0)
      throw new Error("At least one line item is required");

    const id = `inv-0000-0000-0000-${String(this.nextId++).padStart(12, "0")}`;
    const now = new Date();

    const invoice: Invoice = {
      id,
      workspaceId: data.workspaceId,
      clientId: data.clientId,
      projectId: data.projectId || null,
      invoiceNumber: null,
      sequenceNumber: null,
      status: "draft",
      issueDate: data.issueDate || null,
      dueDate: data.dueDate || null,
      paidAt: null,
      currency: data.currency || "INR",
      subtotal: data.subtotal || "0.00",
      discountRate: data.discountRate || "0.00",
      discountAmount: data.discountAmount || "0.00",
      taxableAmount: data.taxableAmount || "0.00",
      taxRate: data.taxRate || "18.00",
      taxAmount: data.taxAmount || "0.00",
      totalAmount: data.totalAmount || "0.00",
      amountPaid: data.amountPaid || "0.00",
      amountDue: data.amountDue || data.totalAmount || "0.00",
      paymentMethod: null,
      paymentReference: null,
      notes: data.notes || null,
      terms: data.terms || null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      deletedAt: null,
    };

    const lineItems: InvoiceItem[] = data.items.map((item, idx) => ({
      id: `item-0000-0000-0000-${String(this.nextItemId++).padStart(12, "0")}`,
      workspaceId: data.workspaceId,
      invoiceId: id,
      description: item.description,
      quantity: item.quantity || "1.00",
      unitPrice: item.unitPrice || "0.00",
      amount: item.amount || "0.00",
      sortOrder: item.sortOrder ?? idx,
    }));

    this.invoices.set(id, invoice);
    this.items.set(id, lineItems);

    return {
      ...invoice,
      items: lineItems,
      clientName: this.clientNames.get(data.clientId) || null,
      projectName: data.projectId
        ? this.projectNames.get(data.projectId) || null
        : null,
    };
  }

  async getById(
    id: string,
    workspaceId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<InvoiceWithItems | null> {
    const inv = this.invoices.get(id);
    if (!inv || inv.workspaceId !== workspaceId) return null;
    if (!options?.includeDeleted && inv.deletedAt) return null;

    const lineItems = this.items.get(id) || [];
    return {
      ...inv,
      items: lineItems,
      clientName: this.clientNames.get(inv.clientId) || null,
      projectName: inv.projectId
        ? this.projectNames.get(inv.projectId) || null
        : null,
    };
  }

  async getByNumber(
    invoiceNumber: string,
    workspaceId: string,
  ): Promise<InvoiceWithItems | null> {
    const inv = Array.from(this.invoices.values()).find(
      (i) =>
        i.workspaceId === workspaceId &&
        i.invoiceNumber === invoiceNumber &&
        !i.deletedAt,
    );
    if (!inv) return null;
    return this.getById(inv.id, workspaceId);
  }

  async list(filters: InvoiceQueryFilters): Promise<InvoiceWithItems[]> {
    const list = Array.from(this.invoices.values()).filter((i) => {
      if (i.workspaceId !== filters.workspaceId) return false;
      if (filters.excludeDeleted !== false && i.deletedAt) return false;
      if (filters.clientId && i.clientId !== filters.clientId) return false;
      if (filters.projectId && i.projectId !== filters.projectId) return false;
      if (
        filters.status &&
        filters.status !== "all" &&
        i.status !== filters.status
      )
        return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const clientName = (
          this.clientNames.get(i.clientId) || ""
        ).toLowerCase();
        const num = (i.invoiceNumber || "").toLowerCase();
        const notes = (i.notes || "").toLowerCase();
        if (
          !clientName.includes(term) &&
          !num.includes(term) &&
          !notes.includes(term)
        )
          return false;
      }
      return true;
    });

    const result: InvoiceWithItems[] = [];
    for (const inv of list) {
      const full = await this.getById(inv.id, filters.workspaceId);
      if (full) result.push(full);
    }
    return result;
  }

  async update(
    id: string,
    workspaceId: string,
    data: UpdateInvoiceRepositoryInput,
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) throw new Error(`Invoice with ID ${id} not found`);
    if (existing.status !== "draft")
      throw new Error(
        `Cannot edit invoice ${id} because it is in '${existing.status}' status and is locked`,
      );

    const updated: Invoice = {
      ...existing,
      clientId: data.clientId || existing.clientId,
      projectId:
        data.projectId !== undefined ? data.projectId : existing.projectId,
      issueDate:
        data.issueDate !== undefined ? data.issueDate : existing.issueDate,
      dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
      subtotal: data.subtotal || existing.subtotal,
      discountRate: data.discountRate || existing.discountRate,
      discountAmount: data.discountAmount || existing.discountAmount,
      taxableAmount: data.taxableAmount || existing.taxableAmount,
      taxRate: data.taxRate || existing.taxRate,
      taxAmount: data.taxAmount || existing.taxAmount,
      totalAmount: data.totalAmount || existing.totalAmount,
      amountPaid: data.amountPaid || existing.amountPaid,
      amountDue: data.amountDue || existing.amountDue,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      terms: data.terms !== undefined ? data.terms : existing.terms,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };

    let lineItems = existing.items;
    if (data.items) {
      lineItems = data.items.map((item, idx) => ({
        id: `item-0000-0000-0000-${String(this.nextItemId++).padStart(12, "0")}`,
        workspaceId,
        invoiceId: id,
        description: item.description,
        quantity: item.quantity || "1.00",
        unitPrice: item.unitPrice || "0.00",
        amount: item.amount || "0.00",
        sortOrder: item.sortOrder ?? idx,
      }));
      this.items.set(id, lineItems);
    }

    this.invoices.set(id, updated);
    return {
      ...updated,
      items: lineItems,
      clientName: this.clientNames.get(updated.clientId) || null,
      projectName: updated.projectId
        ? this.projectNames.get(updated.projectId) || null
        : null,
    };
  }

  async softDelete(
    id: string,
    workspaceId: string,
    deletedBy: string,
  ): Promise<Invoice> {
    const existing = await this.getById(id, workspaceId);
    if (!existing)
      throw new Error(`Invoice with ID ${id} not found or already deleted`);
    if (existing.status !== "draft")
      throw new Error(
        `Cannot delete invoice ${id} because it is in '${existing.status}' status. Only draft invoices can be deleted`,
      );

    const updated: Invoice = {
      ...existing,
      deletedAt: new Date(),
      updatedBy: deletedBy,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return updated;
  }

  async getNextSequenceNumber(workspaceId: string): Promise<number> {
    const seqs = Array.from(this.invoices.values())
      .filter((i) => i.workspaceId === workspaceId && i.sequenceNumber !== null)
      .map((i) => i.sequenceNumber ?? 0);
    return (seqs.length > 0 ? Math.max(...seqs) : 0) + 1;
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
    if (!existing) throw new Error(`Invoice with ID ${id} not found`);
    if (existing.status !== "draft")
      throw new Error(
        `Cannot send invoice ${id} because it is already in '${existing.status}' status`,
      );

    const updated: Invoice = {
      ...existing,
      invoiceNumber: data.invoiceNumber,
      sequenceNumber: data.sequenceNumber,
      status: "sent",
      issueDate: data.issueDate || new Date().toISOString().split("T")[0],
      dueDate: data.dueDate || existing.dueDate,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return { ...updated, items: existing.items };
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
    if (!existing) throw new Error(`Invoice with ID ${id} not found`);
    if (existing.status !== "sent" && existing.status !== "overdue")
      throw new Error(
        `Cannot record payment on invoice ${id} because it is in '${existing.status}' status`,
      );

    const isFullyPaid = Number(data.amountDue) <= 0;
    const updated: Invoice = {
      ...existing,
      amountPaid: data.amountPaid,
      amountDue: data.amountDue,
      paymentMethod: data.paymentMethod || existing.paymentMethod,
      paymentReference: data.paymentReference || existing.paymentReference,
      paidAt: isFullyPaid ? data.paidAt || new Date() : existing.paidAt,
      status: isFullyPaid ? "paid" : existing.status,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return { ...updated, items: existing.items };
  }

  async cancelInvoice(
    id: string,
    workspaceId: string,
    cancelledBy: string,
  ): Promise<InvoiceWithItems> {
    const existing = await this.getById(id, workspaceId);
    if (!existing) throw new Error(`Invoice with ID ${id} not found`);
    if (existing.status === "cancelled")
      throw new Error(`Invoice ${id} is already cancelled`);

    const updated: Invoice = {
      ...existing,
      status: "cancelled",
      updatedBy: cancelledBy,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return { ...updated, items: existing.items };
  }
}
