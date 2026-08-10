import { apiDelete, apiGet, apiPatch, apiPost } from '../../../api/client';
import type {
  CreateInvoiceInput,
  InvoiceResponse,
  ListInvoicesFilters,
  RecordPaymentInput,
  SendInvoiceInput,
  UpdateInvoiceInput,
} from './invoice.types';

export async function getInvoices(
  workspaceId: string,
  filters?: ListInvoicesFilters,
): Promise<InvoiceResponse[]> {
  const params = new URLSearchParams();
  if (filters?.clientId) params.append('clientId', filters.clientId);
  if (filters?.projectId) params.append('projectId', filters.projectId);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/workspaces/${workspaceId}/invoices${queryString ? `?${queryString}` : ''}`;
  return apiGet<InvoiceResponse[]>(url);
}

export async function getInvoice(
  workspaceId: string,
  id: string,
): Promise<InvoiceResponse> {
  return apiGet<InvoiceResponse>(`/workspaces/${workspaceId}/invoices/${id}`);
}

export async function createInvoice(
  workspaceId: string,
  data: CreateInvoiceInput,
): Promise<InvoiceResponse> {
  return apiPost<InvoiceResponse>(`/workspaces/${workspaceId}/invoices`, data);
}

export async function updateInvoice(
  workspaceId: string,
  id: string,
  data: UpdateInvoiceInput,
): Promise<InvoiceResponse> {
  return apiPatch<InvoiceResponse>(`/workspaces/${workspaceId}/invoices/${id}`, data);
}

export async function sendInvoice(
  workspaceId: string,
  id: string,
  data: SendInvoiceInput = {},
): Promise<InvoiceResponse> {
  return apiPost<InvoiceResponse>(`/workspaces/${workspaceId}/invoices/${id}/send`, data);
}

export async function recordPayment(
  workspaceId: string,
  id: string,
  data: RecordPaymentInput,
): Promise<InvoiceResponse> {
  return apiPost<InvoiceResponse>(`/workspaces/${workspaceId}/invoices/${id}/pay`, data);
}

export async function cancelInvoice(
  workspaceId: string,
  id: string,
): Promise<InvoiceResponse> {
  return apiPost<InvoiceResponse>(`/workspaces/${workspaceId}/invoices/${id}/cancel`, {});
}

export async function deleteInvoice(
  workspaceId: string,
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  return apiDelete<{ id: string; deleted: boolean }>(`/workspaces/${workspaceId}/invoices/${id}`);
}
