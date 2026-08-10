import type { ClientRepository } from "../client/repository/client.repository";
import type { ProjectRepository } from "../project/repository/project.repository";
import type { WorkspaceMemberRepository } from "../workspace/repository";
import {
  InvoiceClientMismatchError,
  InvoiceDomainError,
  InvoiceDraftOnlyDeleteError,
  InvoiceImmutableError,
  InvoiceInternalError,
  InvoiceInvalidStatusTransitionError,
  InvoiceNotFoundError,
  InvoicePermissionDeniedError,
  InvoiceProjectMismatchError,
} from "./invoice.errors";
import type { IInvoiceEventEmitter } from "./invoice.events";
import {
  canCancelInvoice,
  canCreateInvoice,
  canDeleteInvoice,
  canRecordPayment,
  canSendInvoice,
  canUpdateInvoice,
  canViewInvoice,
} from "./invoice.policies";
import type {
  CreateInvoiceInput,
  RecordPaymentInput,
  SendInvoiceInput,
  UpdateInvoiceInput,
} from "./invoice.schema";
import type { InvoiceQueryFilters, InvoiceWithItems } from "./invoice.types";
import type { InvoiceRepository } from "./repository/invoice.repository";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: InvoiceDomainError };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function err<T>(error: InvoiceDomainError): Result<T> {
  return { success: false, error };
}

function formatMoney(num: number): string {
  return (Math.round(num * 100) / 100).toFixed(2);
}

export function calculateInvoiceTotals(
  items: Array<{
    description: string;
    quantity?: string | number;
    unitPrice?: string | number;
    sortOrder?: number;
  }>,
  discountRateStr = "0.00",
  taxRateStr = "18.00",
) {
  let subtotalNum = 0;
  const processedItems = items.map((item, idx) => {
    const qty = Number(item.quantity ?? "1.00");
    const price = Number(item.unitPrice ?? "0.00");
    const amtNum = qty * price;
    subtotalNum += amtNum;
    return {
      description: item.description,
      quantity: formatMoney(qty),
      unitPrice: formatMoney(price),
      amount: formatMoney(amtNum),
      sortOrder: item.sortOrder ?? idx,
    };
  });

  const subtotal = formatMoney(subtotalNum);
  const discountRate = formatMoney(Number(discountRateStr));
  const discountAmountNum = subtotalNum * (Number(discountRate) / 100);
  const discountAmount = formatMoney(discountAmountNum);

  const taxableAmountNum = subtotalNum - discountAmountNum;
  const taxableAmount = formatMoney(taxableAmountNum);

  const taxRate = formatMoney(Number(taxRateStr));
  const taxAmountNum = taxableAmountNum * (Number(taxRate) / 100);
  const taxAmount = formatMoney(taxAmountNum);

  const totalAmountNum = taxableAmountNum + taxAmountNum;
  const totalAmount = formatMoney(totalAmountNum);

  return {
    subtotal,
    discountRate,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
    amountDue: totalAmount,
    items: processedItems,
  };
}

export function generateInvoiceNumber(
  sequenceNumber: number,
  year: number = new Date().getFullYear(),
): string {
  return `INV-${year}-${String(sequenceNumber).padStart(4, "0")}`;
}

export class InvoiceService {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly clientRepo: ClientRepository,
    private readonly projectRepo: ProjectRepository | null,
    private readonly eventEmitter: IInvoiceEventEmitter,
  ) {}

  async createInvoice(
    input: CreateInvoiceInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canCreateInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const client = await this.clientRepo.getById(input.clientId, workspaceId);
      if (!client) {
        return err(new InvoiceClientMismatchError(input.clientId, workspaceId));
      }

      if (input.projectId && this.projectRepo) {
        const project = await this.projectRepo.getById(
          input.projectId,
          workspaceId,
        );
        if (!project) {
          return err(
            new InvoiceProjectMismatchError(input.projectId, workspaceId),
          );
        }
      }

      const totals = calculateInvoiceTotals(
        input.items,
        input.discountRate,
        input.taxRate,
      );

      const invoice = await this.invoiceRepo.create({
        workspaceId,
        clientId: input.clientId,
        projectId: input.projectId || null,
        issueDate: input.issueDate || null,
        dueDate: input.dueDate || null,
        currency: input.currency || "INR",
        subtotal: totals.subtotal,
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        taxableAmount: totals.taxableAmount,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        amountPaid: "0.00",
        amountDue: totals.totalAmount,
        notes: input.notes || null,
        terms: input.terms || null,
        createdBy: actorId,
        updatedBy: actorId,
        items: totals.items,
      });

      await this.eventEmitter.emit({
        type: "invoice.created",
        invoiceId: invoice.id,
        workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        invoice,
      });

      return ok(invoice);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("createInvoice", error));
    }
  }

  async getInvoice(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "get",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const invoice = await this.invoiceRepo.getById(id, workspaceId);
      if (!invoice) {
        return err(new InvoiceNotFoundError(id));
      }

      return ok(invoice);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("getInvoice", error));
    }
  }

  async listInvoices(
    filters: InvoiceQueryFilters,
    actorId: string,
  ): Promise<Result<InvoiceWithItems[]>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        filters.workspaceId,
        actorId,
      );
      const policy = canViewInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "list",
            actorId,
            filters.workspaceId,
            policy.reason,
          ),
        );
      }

      const invoices = await this.invoiceRepo.list(filters);
      return ok(invoices);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("listInvoices", error));
    }
  }

  async updateInvoice(
    id: string,
    input: UpdateInvoiceInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.invoiceRepo.getById(id, workspaceId);
      if (!existing) {
        return err(new InvoiceNotFoundError(id));
      }

      if (existing.status !== "draft") {
        return err(new InvoiceImmutableError(id, existing.status, "update"));
      }

      if (input.clientId) {
        const client = await this.clientRepo.getById(
          input.clientId,
          workspaceId,
        );
        if (!client) {
          return err(
            new InvoiceClientMismatchError(input.clientId, workspaceId),
          );
        }
      }

      if (input.projectId && this.projectRepo) {
        const project = await this.projectRepo.getById(
          input.projectId,
          workspaceId,
        );
        if (!project) {
          return err(
            new InvoiceProjectMismatchError(input.projectId, workspaceId),
          );
        }
      }

      const itemsToCalculate = input.items || existing.items;
      const discountRate =
        input.discountRate !== undefined
          ? input.discountRate
          : existing.discountRate || "0.00";
      const taxRate =
        input.taxRate !== undefined
          ? input.taxRate
          : existing.taxRate || "18.00";

      const totals = calculateInvoiceTotals(
        itemsToCalculate,
        discountRate,
        taxRate,
      );

      const updated = await this.invoiceRepo.update(id, workspaceId, {
        clientId: input.clientId,
        projectId: input.projectId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        subtotal: totals.subtotal,
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        taxableAmount: totals.taxableAmount,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        amountDue: totals.totalAmount,
        notes: input.notes,
        terms: input.terms,
        updatedBy: actorId,
        items: input.items ? totals.items : undefined,
      });

      await this.eventEmitter.emit({
        type: "invoice.updated",
        invoiceId: id,
        workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        invoice: updated,
      });

      return ok(updated);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("updateInvoice", error));
    }
  }

  async sendInvoice(
    id: string,
    input: SendInvoiceInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canSendInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "send",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.invoiceRepo.getById(id, workspaceId);
      if (!existing) {
        return err(new InvoiceNotFoundError(id));
      }

      if (existing.status !== "draft") {
        return err(
          new InvoiceInvalidStatusTransitionError(id, existing.status, "sent"),
        );
      }

      const sequenceNumber =
        await this.invoiceRepo.getNextSequenceNumber(workspaceId);
      const invoiceNumber = generateInvoiceNumber(sequenceNumber);

      const issued = await this.invoiceRepo.issueInvoice(id, workspaceId, {
        invoiceNumber,
        sequenceNumber,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "invoice.sent",
        invoiceId: id,
        workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        invoice: issued,
      });

      return ok(issued);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("sendInvoice", error));
    }
  }

  async recordPayment(
    id: string,
    input: RecordPaymentInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canRecordPayment(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "pay",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.invoiceRepo.getById(id, workspaceId);
      if (!existing) {
        return err(new InvoiceNotFoundError(id));
      }

      if (existing.status !== "sent" && existing.status !== "overdue") {
        return err(
          new InvoiceInvalidStatusTransitionError(id, existing.status, "paid"),
        );
      }

      const currentPaid = Number(existing.amountPaid || "0.00");
      const paymentIncrement = Number(input.amountPaid);
      const newAmountPaidNum = currentPaid + paymentIncrement;
      const totalAmountNum = Number(existing.totalAmount);
      const newAmountDueNum = Math.max(0, totalAmountNum - newAmountPaidNum);

      const amountPaid = formatMoney(newAmountPaidNum);
      const amountDue = formatMoney(newAmountDueNum);

      const updated = await this.invoiceRepo.recordPayment(id, workspaceId, {
        amountPaid,
        amountDue,
        paymentMethod: input.paymentMethod || undefined,
        paymentReference: input.paymentReference || undefined,
        paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
        updatedBy: actorId,
      });

      if (updated.status === "paid") {
        await this.eventEmitter.emit({
          type: "invoice.paid",
          invoiceId: id,
          workspaceId,
          actorId,
          occurredAt: new Date().toISOString(),
          invoice: updated,
        });
      }

      return ok(updated);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("recordPayment", error));
    }
  }

  async cancelInvoice(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<InvoiceWithItems>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canCancelInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "cancel",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.invoiceRepo.getById(id, workspaceId);
      if (!existing) {
        return err(new InvoiceNotFoundError(id));
      }

      if (existing.status === "cancelled") {
        return err(
          new InvoiceInvalidStatusTransitionError(
            id,
            existing.status,
            "cancelled",
          ),
        );
      }

      const cancelled = await this.invoiceRepo.cancelInvoice(
        id,
        workspaceId,
        actorId,
      );

      await this.eventEmitter.emit({
        type: "invoice.cancelled",
        invoiceId: id,
        workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        invoice: cancelled,
      });

      return ok(cancelled);
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("cancelInvoice", error));
    }
  }

  async deleteInvoice(
    id: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<{ id: string }>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canDeleteInvoice(membership);
      if (!policy.allowed) {
        return err(
          new InvoicePermissionDeniedError(
            "delete",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.invoiceRepo.getById(id, workspaceId);
      if (!existing) {
        return err(new InvoiceNotFoundError(id));
      }

      if (existing.status !== "draft") {
        return err(new InvoiceDraftOnlyDeleteError(id, existing.status));
      }

      await this.invoiceRepo.softDelete(id, workspaceId, actorId);

      await this.eventEmitter.emit({
        type: "invoice.deleted",
        invoiceId: id,
        workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
      });

      return ok({ id });
    } catch (error: unknown) {
      if (error instanceof InvoiceDomainError) return err(error);
      return err(new InvoiceInternalError("deleteInvoice", error));
    }
  }
}
