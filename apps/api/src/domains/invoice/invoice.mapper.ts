import type { InvoiceWithItems } from "./invoice.types";

export interface InvoiceItemResponse {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
}

export interface InvoiceResponse {
  id: string;
  workspaceId: string;
  clientId: string;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  invoiceNumber: string | null;
  sequenceNumber: number | null;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  currency: string;
  subtotal: string;
  discountRate: string | null;
  discountAmount: string | null;
  taxableAmount: string;
  taxRate: string | null;
  taxAmount: string | null;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
  items: InvoiceItemResponse[];
}

export function mapInvoiceToResponse(
  invoice: InvoiceWithItems,
): InvoiceResponse {
  return {
    id: invoice.id,
    workspaceId: invoice.workspaceId,
    clientId: invoice.clientId,
    clientName: invoice.clientName || null,
    projectId: invoice.projectId || null,
    projectName: invoice.projectName || null,
    invoiceNumber: invoice.invoiceNumber,
    sequenceNumber: invoice.sequenceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate ? String(invoice.issueDate) : null,
    dueDate: invoice.dueDate ? String(invoice.dueDate) : null,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    discountRate: invoice.discountRate,
    discountAmount: invoice.discountAmount,
    taxableAmount: invoice.taxableAmount,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    amountPaid: invoice.amountPaid,
    amountDue: invoice.amountDue,
    paymentMethod: invoice.paymentMethod,
    paymentReference: invoice.paymentReference,
    notes: invoice.notes,
    terms: invoice.terms,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    createdBy: invoice.createdBy,
    updatedBy: invoice.updatedBy,
    deletedAt: invoice.deletedAt ? invoice.deletedAt.toISOString() : null,
    items: invoice.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      sortOrder: item.sortOrder,
    })),
  };
}

export function mapInvoicesToResponse(
  invoices: InvoiceWithItems[],
): InvoiceResponse[] {
  return invoices.map(mapInvoiceToResponse);
}
