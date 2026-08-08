'use client';

import { useQuery } from '@tanstack/react-query';
import { getClients, clientKeys, type ListClientsFilters } from '../api';

export function useClients(workspaceId: string, filters?: ListClientsFilters) {
  return useQuery({
    queryKey: clientKeys.list(workspaceId, filters as Record<string, unknown>),
    queryFn: () => getClients(workspaceId, filters),
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
