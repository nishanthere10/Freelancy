'use client';

import { useQuery } from '@tanstack/react-query';
import { getInvoices, invoiceKeys, type ListInvoicesFilters } from '../api';

export function useInvoices(workspaceId: string, filters?: ListInvoicesFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(workspaceId, filters),
    queryFn: () => getInvoices(workspaceId, filters),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 5,
  });
}
