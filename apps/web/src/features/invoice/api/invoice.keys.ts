import type { ListInvoicesFilters } from './invoice.types';

export const invoiceKeys = {
  all: (workspaceId: string) => ['workspaces', workspaceId, 'invoices'] as const,
  lists: (workspaceId: string) => [...invoiceKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters?: ListInvoicesFilters) =>
    [...invoiceKeys.lists(workspaceId), filters ?? {}] as const,
  details: (workspaceId: string) => [...invoiceKeys.all(workspaceId), 'detail'] as const,
  detail: (workspaceId: string, id: string) =>
    [...invoiceKeys.details(workspaceId), id] as const,
};
