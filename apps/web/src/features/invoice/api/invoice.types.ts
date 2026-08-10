export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

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
  status: InvoiceStatus;
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

export interface CreateInvoiceItemInput {
  description: string;
  quantity?: string | number;
  unitPrice?: string | number;
  sortOrder?: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  discountRate?: string | number;
  taxRate?: string | number;
  notes?: string | null;
  terms?: string | null;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  clientId?: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  discountRate?: string | number;
  taxRate?: string | number;
  notes?: string | null;
  terms?: string | null;
  items?: CreateInvoiceItemInput[];
}

export interface SendInvoiceInput {
  issueDate?: string;
  dueDate?: string;
}

export interface RecordPaymentInput {
  amountPaid: string | number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
}

export interface ListInvoicesFilters {
  clientId?: string;
  projectId?: string;
  status?: InvoiceStatus | 'all';
  search?: string;
}
