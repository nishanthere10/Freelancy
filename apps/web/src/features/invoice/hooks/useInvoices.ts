"use client";

import { useQuery } from "@tanstack/react-query";
import { type ListInvoicesFilters, getInvoices, invoiceKeys } from "../api";

export function useInvoices(
  workspaceId: string,
  filters?: ListInvoicesFilters,
) {
  return useQuery({
    queryKey: invoiceKeys.list(workspaceId, filters),
    queryFn: () => getInvoices(workspaceId, filters),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 5,
  });
}
