'use client';

import { useQuery } from '@tanstack/react-query';
import { getInvoice, invoiceKeys } from '../api';

export function useInvoice(workspaceId: string, id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(workspaceId, id),
    queryFn: () => getInvoice(workspaceId, id),
    enabled: Boolean(workspaceId) && Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}
