import type { Invoice, InvoiceItem, InvoiceStatus } from "@repo/database";

export interface CreateInvoiceItemRepositoryInput {
  description: string;
  quantity?: string;
  unitPrice?: string;
  amount?: string;
  sortOrder?: number;
}

export interface CreateInvoiceRepositoryInput {
  workspaceId: string;
  clientId: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  discountRate?: string | null;
  discountAmount?: string | null;
  taxableAmount?: string;
  taxRate?: string | null;
  taxAmount?: string | null;
  totalAmount?: string;
  amountPaid?: string;
  amountDue?: string;
  notes?: string | null;
  terms?: string | null;
  createdBy: string;
  updatedBy: string;
  items: CreateInvoiceItemRepositoryInput[];
}

export interface UpdateInvoiceRepositoryInput {
  clientId?: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  discountRate?: string | null;
  discountAmount?: string | null;
  taxableAmount?: string;
  taxRate?: string | null;
  taxAmount?: string | null;
  totalAmount?: string;
  amountPaid?: string;
  amountDue?: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  terms?: string | null;
  status?: InvoiceStatus;
  updatedBy: string;
  items?: CreateInvoiceItemRepositoryInput[];
}

export interface InvoiceQueryFilters {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus | "all";
  search?: string;
  excludeDeleted?: boolean;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  clientName?: string | null;
  projectName?: string | null;
}
