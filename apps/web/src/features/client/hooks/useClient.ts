'use client';

import { useQuery } from '@tanstack/react-query';
import { getClient, clientKeys } from '../api';

export function useClient(workspaceId: string, clientId: string) {
  return useQuery({
    queryKey: clientKeys.detail(workspaceId, clientId),
    queryFn: () => getClient(workspaceId, clientId),
    enabled: Boolean(workspaceId && clientId),
    staleTime: 1000 * 60 * 5,
  });
}
